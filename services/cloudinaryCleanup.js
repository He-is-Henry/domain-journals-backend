/**
 * Removes Cloudinary uploads that nothing in MongoDB references any more
 * (replaced manuscript files, deleted manuscripts, removed figures, abandoned uploads...).
 *
 * How it decides:
 *  1. Scans every document in every collection and extracts all res.cloudinary.com URLs
 *     (this also finds figure URLs inside the JSON stored in `content`).
 *  2. Lists the assets in the managed folders through the Cloudinary Admin API.
 *  3. An asset with no matching URL is an orphan. Orphans younger than `minAgeHours`
 *     are kept, because an upload can exist for a while before its form is saved.
 *
 * Safe by default: dry run, grace period, protected ids, and a guard that refuses to
 * delete more than half of a folder in one go unless `force` is set.
 *
 * Cloudinary deletes are permanent (unless backup is enabled on the account),
 * so review a dry run before using --delete.
 */

// Folders written by uploads.js
const FOLDERS = [
  { prefix: "manuscripts/", resourceType: "raw" },
  { prefix: "avatars/", resourceType: "image" },
  { prefix: "receipt/", resourceType: "image" },
  { prefix: "figure/", resourceType: "image" },
];

// .../<resource_type>/upload/<transformations?>/<v123/>?<public_id>[.ext]
const URL_RE =
  /https?:\/\/res\.cloudinary\.com\/[^/\s"'\\]+\/(image|raw|video)\/upload\/([^\s"'\\<>?#]+)/gi;

const stripExt = (p) => p.replace(/\.[A-Za-z0-9]{1,8}$/, "");

// Images list their public_id without extension, raw files with it (PDFs here have none).
// Comparing without extensions makes URL and API id line up in every case.
const keyOf = (resourceType, publicId) =>
  `${resourceType}:${stripExt(publicId)}`;

const publicIdFromPath = (rest) => {
  const segs = rest.replace(/[.,;:!)\]}]+$/, "").split("/");
  const v = segs.findIndex((s) => /^v\d+$/.test(s));
  let start = v + 1; // v === -1 -> 0
  if (v === -1) {
    // no version segment: skip leading transformation segments such as "fl_attachment"
    while (start < segs.length - 1 && /^[a-z]{1,4}_[^/]*$/i.test(segs[start]))
      start++;
  }
  let id = segs.slice(start).join("/");
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep raw */
  }
  return id;
};

/** All Cloudinary asset keys referenced by URLs inside `text`. */
const extractKeys = (text, into = new Set()) => {
  for (const m of text.matchAll(URL_RE)) {
    into.add(keyOf(m[1].toLowerCase(), publicIdFromPath(m[2])));
  }
  return into;
};

const collectReferencedKeys = async (onlyCollections) => {
  const mongoose = require("mongoose");
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose is not connected.");

  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter(
      (n) =>
        !n.startsWith("system.") &&
        (!onlyCollections || onlyCollections.includes(n)),
    );

  const keys = new Set();
  let docs = 0;
  for (const name of names) {
    for await (const doc of db.collection(name).find({})) {
      docs++;
      extractKeys(JSON.stringify(doc), keys);
    }
  }
  return { keys, docs, collections: names.length };
};

const listAssets = async (cloudinary, { prefix, resourceType }) => {
  const assets = [];
  let next_cursor;
  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      prefix,
      max_results: 500,
      next_cursor,
    });
    assets.push(...res.resources);
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return assets;
};

/**
 * @param {object}   o
 * @param {boolean}  o.dryRun       default true: report only
 * @param {number}   o.minAgeHours  default 72: never delete anything newer than this
 * @param {string[]} o.protect      public_id substrings that must never be deleted
 * @param {boolean}  o.force        skip the "more than half of a folder" guard
 * @param {string[]} o.collections  limit the reference scan (default: all collections)
 * @returns report object (see bottom)
 */
const runCleanup = async ({
  dryRun = true,
  minAgeHours = 72,
  protect = [],
  force = false,
  collections = null,
  folders = FOLDERS,
  log = console.log,
} = {}) => {
  const cloudinary = require("../cloudinary");
  const cutoff = Date.now() - minAgeHours * 3600 * 1000;

  // DB first, listing second: anything uploaded while we scan is inside the grace period
  const {
    keys,
    docs,
    collections: collCount,
  } = await collectReferencedKeys(collections);
  log(
    `Scanned ${docs} documents in ${collCount} collections: ${keys.size} Cloudinary references.`,
  );
  if (keys.size === 0) {
    throw new Error(
      "No Cloudinary references found in the database. Refusing to continue (wrong database?).",
    );
  }

  const plan = [];
  for (const folder of folders) {
    const assets = await listAssets(cloudinary, folder);
    const s = {
      ...folder,
      total: assets.length,
      referenced: 0,
      protected: 0,
      tooNew: 0,
      orphans: [],
    };

    for (const a of assets) {
      if (keys.has(keyOf(a.resource_type || folder.resourceType, a.public_id)))
        s.referenced++;
      else if (protect.some((p) => a.public_id.includes(p))) s.protected++;
      else if (new Date(a.created_at).getTime() > cutoff) s.tooNew++;
      else
        s.orphans.push({
          public_id: a.public_id,
          bytes: a.bytes || 0,
          created_at: a.created_at,
        });
    }

    log(
      `${folder.prefix} total ${s.total}, referenced ${s.referenced}, protected ${s.protected}, ` +
        `too new ${s.tooNew}, orphaned ${s.orphans.length}`,
    );

    if (!force && s.orphans.length > 20 && s.orphans.length / s.total > 0.5) {
      throw new Error(
        `${folder.prefix}: ${s.orphans.length} of ${s.total} assets look orphaned. That is suspicious, ` +
          `so nothing was deleted. Check the dry-run report, then re-run with force if it is correct.`,
      );
    }
    plan.push(s);
  }

  if (!dryRun) {
    for (const s of plan) {
      s.deleted = 0;
      for (let i = 0; i < s.orphans.length; i += 100) {
        const ids = s.orphans.slice(i, i + 100).map((o) => o.public_id);
        const res = await cloudinary.api.delete_resources(ids, {
          resource_type: s.resourceType,
          type: "upload",
          invalidate: true,
        });
        s.deleted += Object.values(res.deleted || {}).filter(
          (v) => v === "deleted",
        ).length;
      }
      log(`${s.prefix} deleted ${s.deleted}`);
    }
  }

  return {
    dryRun,
    minAgeHours,
    scannedDocs: docs,
    references: keys.size,
    folders: plan,
  };
};

module.exports = { runCleanup, extractKeys, keyOf, FOLDERS };
