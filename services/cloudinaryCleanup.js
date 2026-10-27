/**
 * Removes Cloudinary uploads that nothing in MongoDB references any more
 * (replaced manuscript files, deleted manuscripts, removed figures, abandoned uploads...).
 *
 * How it decides:
 *  1. Walks every field of every document in every collection and extracts all Cloudinary
 *     delivery URLs, remembering WHICH collection / field / document each one came from.
 *     (URLs inside the JSON stored in `content` are found too: they are reported under `content`.)
 *  2. Lists the assets in the managed folders through the Cloudinary Admin API.
 *  3. An asset with no matching URL is an orphan. Orphans younger than `minAgeHours` are kept,
 *     because an upload can exist for a while before its form is saved.
 *  4. Cross-check the other way: URLs in the DB that point into a managed folder but match no
 *     listed asset are reported as "dangling". Many of those means the matching is wrong.
 *
 * Safe by default: dry run, grace period, protected ids, and a guard that blocks the whole run
 * when more than half of a folder looks orphaned (unless `force`). A blocked run still returns
 * the full report so you can review it.
 *
 * Cloudinary deletes are permanent (unless backup is enabled on the account).
 */

// Folders written by uploads.js
const FOLDERS = [
  { prefix: "manuscripts/", resourceType: "raw" },
  { prefix: "avatars/", resourceType: "image" },
  { prefix: "receipt/", resourceType: "image" },
  { prefix: "figure/", resourceType: "image" },
];

const MAX_LOCATIONS = 3; // remembered locations per asset
const MAX_LOGGED = 40; // orphans printed per folder (the report has all of them)

// https://res.cloudinary.com/<cloud>/<type>/upload/<transformations?>/<v123/>?<public_id>[.ext]
// also res-1.cloudinary.com and private CDN hosts (<cloud>-res.cloudinary.com/<type>/upload/...)
const URL_RE =
  /https?:\/\/[a-z0-9.-]*cloudinary\.com\/(?:[^/\s"'\\]+\/)??(image|raw|video)\/upload\/([^\s"'\\<>?#]+)/gi;

const stripExt = (p) => p.replace(/\.[A-Za-z0-9]{1,8}$/, "");

// The resource type is the one we asked the API for (never trust a per-asset field).
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

const folderOfKey = (key) => {
  const i = key.indexOf(":");
  const id = key.slice(i + 1);
  const j = id.lastIndexOf("/");
  return `${key.slice(0, i)}:${j === -1 ? "(root)" : id.slice(0, j)}`;
};

// Visit every string in a document with its field path ("coAuthors[].email")
const walk = (v, path, visit) => {
  if (typeof v === "string") return visit(v, path);
  if (!v || typeof v !== "object" || v instanceof Date || v._bsontype) return;
  if (Array.isArray(v)) {
    for (const x of v) walk(x, `${path}[]`, visit);
    return;
  }
  for (const [k, x] of Object.entries(v))
    walk(x, path ? `${path}.${k}` : k, visit);
};

const collectReferences = async (db, onlyCollections, log = console.log) => {
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter(
      (n) =>
        !n.startsWith("system.") &&
        (!onlyCollections || onlyCollections.includes(n)),
    );

  log(`\nFound ${names.length} collection(s) to scan: ${names.join(", ")}`);

  const refs = new Map(); // key -> [{ collection, field, id }]
  const byField = new Map(); // "collection.field" -> number of URLs found
  let docs = 0;

  for (const name of names) {
    const col = db.collection(name);
    let totalColDocs = 0;
    try {
      totalColDocs = await col.estimatedDocumentCount();
    } catch {
      totalColDocs = await col.countDocuments().catch(() => 0);
    }

    log(`\nScanning collection "${name}" (${totalColDocs} documents found)...`);

    // Log progress every 10% (or at least every document for very small collections)
    const logInterval = Math.max(1, Math.floor(totalColDocs / 10));
    let colDocsScanned = 0;
    let colDocsWithUrls = 0;
    let colUrlsFound = 0;

    for await (const doc of col.find({})) {
      colDocsScanned++;
      docs++;
      let docHasUrl = false;

      walk(doc, "", (str, field) => {
        for (const m of str.matchAll(URL_RE)) {
          docHasUrl = true;
          colUrlsFound++;
          const key = keyOf(m[1].toLowerCase(), publicIdFromPath(m[2]));
          const where = refs.get(key) || [];
          if (where.length < MAX_LOCATIONS)
            where.push({ collection: name, field, id: String(doc._id) });
          refs.set(key, where);
          const f = `${name}.${field}`;
          byField.set(f, (byField.get(f) || 0) + 1);
        }
      });

      if (docHasUrl) colDocsWithUrls++;

      if (
        totalColDocs > 0 &&
        (colDocsScanned % logInterval === 0 || colDocsScanned === totalColDocs)
      ) {
        const pct = Math.round((colDocsScanned / totalColDocs) * 100);
        log(
          `  [${name}] ${colDocsScanned}/${totalColDocs} documents scanned (${pct}%)`,
        );
      }
    }

    log(
      `Finished "${name}": ${colDocsScanned} docs scanned | ${colDocsWithUrls} document(s) contained Cloudinary URLs (${colUrlsFound} total references found).`,
    );
  }

  return { refs, byField, docs, collections: names.length };
};

const listAssets = async (
  cloudinary,
  { prefix, resourceType },
  log = console.log,
) => {
  const assets = [];
  let next_cursor;
  let page = 1;

  log(
    `\nFetching Cloudinary resources for folder "${prefix}" (${resourceType})...`,
  );

  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      prefix,
      max_results: 500,
      next_cursor,
    });
    assets.push(...res.resources);
    log(
      `  [${prefix}] Page ${page}: fetched ${res.resources.length} asset(s) (total so far: ${assets.length})`,
    );
    next_cursor = res.next_cursor;
    page++;
  } while (next_cursor);

  return assets;
};

const sorted = (map) => [...map].sort((a, b) => b[1] - a[1]);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/**
 * @param {object}   o
 * @param {boolean}  o.dryRun       default true: report only
 * @param {number}   o.minAgeHours  default 72: never delete anything newer than this
 * @param {string[]} o.protect      public_id substrings that must never be deleted
 * @param {boolean}  o.force        allow deleting more than half of a folder
 * @param {string[]} o.collections  limit the reference scan (default: all collections)
 * @param {object}   o.deps         { db, cloudinary } overrides (tests)
 * @returns the full report; `blocked` lists folders that tripped the guard
 */
const runCleanup = async ({
  dryRun = true,
  minAgeHours = 72,
  protect = [],
  force = false,
  collections = null,
  folders = FOLDERS,
  deps = {},
  log = console.log,
} = {}) => {
  const cloudinary = deps.cloudinary || require("../cloudinary");
  const db = deps.db || require("mongoose").connection.db;
  if (!db) throw new Error("Mongoose is not connected.");
  const cutoff = Date.now() - minAgeHours * 3600 * 1000;

  // DB first, listing second: anything uploaded while we scan is inside the grace period
  const {
    refs,
    byField,
    docs,
    collections: collCount,
  } = await collectReferences(db, collections, log);
  log(
    `\nDatabase scan complete: Scanned ${docs} documents across ${collCount} collections. Found ${refs.size} distinct Cloudinary assets referenced.`,
  );
  if (refs.size === 0) {
    throw new Error(
      "No Cloudinary references found in the database. Refusing to continue (wrong database?).",
    );
  }

  log("\nReferences by collection.field (URLs found):");
  for (const [f, n] of sorted(byField).slice(0, 30))
    log(`  ${String(n).padStart(6)}  ${f}`);

  const byFolder = new Map();
  for (const key of refs.keys())
    byFolder.set(folderOfKey(key), (byFolder.get(folderOfKey(key)) || 0) + 1);
  log("\nReferenced assets by Cloudinary folder (distinct):");
  for (const [f, n] of sorted(byFolder))
    log(`  ${String(n).padStart(6)}  ${f}`);

  let rootFolders = [];
  try {
    rootFolders = ((await cloudinary.api.root_folders()).folders || []).map(
      (f) => f.name,
    );
    log(`\nCloudinary root folders: ${rootFolders.join(", ") || "(none)"}`);
    const unmanaged = rootFolders.filter(
      (n) => !folders.some((f) => f.prefix === `${n}/`),
    );
    if (unmanaged.length)
      log(
        `  not scanned (not managed by this script): ${unmanaged.join(", ")}`,
      );
  } catch (err) {
    log(`\n(could not list root folders: ${err.message})`);
  }

  const plan = [];
  const blocked = [];
  for (const folder of folders) {
    const assets = await listAssets(cloudinary, folder, log);
    const assetKeys = new Set(
      assets.map((a) => keyOf(folder.resourceType, a.public_id)),
    );
    const s = {
      ...folder,
      referenced: [],
      protected: [],
      tooNew: [],
      orphans: [],
      dangling: [],
    };

    for (const a of assets) {
      const key = keyOf(folder.resourceType, a.public_id);
      if (refs.has(key))
        s.referenced.push({ public_id: a.public_id, where: refs.get(key) });
      else if (protect.some((p) => a.public_id.includes(p)))
        s.protected.push(a.public_id);
      else if (new Date(a.created_at).getTime() > cutoff)
        s.tooNew.push(a.public_id);
      else
        s.orphans.push({
          public_id: a.public_id,
          bytes: a.bytes || 0,
          created_at: a.created_at,
        });
    }

    // DB points into this folder but nothing listed matches: a sign the matching is off
    const keyPrefix = `${folder.resourceType}:${folder.prefix}`;
    for (const [key, where] of refs) {
      if (key.startsWith(keyPrefix) && !assetKeys.has(key))
        s.dangling.push({ key, where });
    }

    s.total = assets.length;
    log(
      `\n${folder.prefix} (${folder.resourceType}): total ${s.total}, referenced ${s.referenced.length}, ` +
        `protected ${s.protected.length}, too new ${s.tooNew.length}, orphaned ${s.orphans.length}, ` +
        `dangling DB references ${s.dangling.length}`,
    );
    for (const o of s.orphans.slice(0, MAX_LOGGED)) {
      log(
        `  orphan  ${o.public_id}  (${mb(o.bytes)}, ${String(o.created_at).slice(0, 10)})`,
      );
    }
    if (s.orphans.length > MAX_LOGGED)
      log(`  ... and ${s.orphans.length - MAX_LOGGED} more (see the report)`);
    for (const d of s.dangling.slice(0, 10)) {
      const w = d.where[0];
      log(`  dangling  ${d.key}  <- ${w.collection}.${w.field} (${w.id})`);
    }

    if (s.orphans.length > 20 && s.orphans.length / s.total > 0.5) {
      blocked.push({
        prefix: folder.prefix,
        orphaned: s.orphans.length,
        total: s.total,
      });
    }
    plan.push(s);
  }

  const mustStop = blocked.length > 0 && !force;
  if (blocked.length) {
    log(
      `\n${mustStop ? "BLOCKED" : "WARNING"}: more than half of the assets in ${blocked.map((b) => b.prefix).join(", ")} ` +
        `look orphaned. Check "dangling" and the field breakdown above before trusting this.`,
    );
  }

  if (!dryRun && !mustStop) {
    for (const s of plan) {
      s.deleted = 0;
      for (let i = 0; i < s.orphans.length; i += 100) {
        const ids = s.orphans.slice(i, i + 100).map((o) => o.public_id);
        log(
          `Deleting batch ${Math.floor(i / 100) + 1} (${ids.length} items) from ${s.prefix}...`,
        );
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
    forced: force,
    blocked,
    minAgeHours,
    scannedDocs: docs,
    referencedAssets: refs.size,
    referencesByField: Object.fromEntries(sorted(byField)),
    referencesByFolder: Object.fromEntries(sorted(byFolder)),
    rootFolders,
    folders: plan,
  };
};

module.exports = { runCleanup, extractKeys, keyOf, FOLDERS };
