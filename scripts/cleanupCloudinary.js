/**
 * Usage (from the backend root):
 *   node scripts/cleanupCloudinary.js                       dry run: lists what WOULD be deleted
 *   node scripts/cleanupCloudinary.js --delete              really delete
 *
 * Options:
 *   --min-age-hours=72      never touch assets newer than this (default 72)
 *   --protect=id1,id2       public_id substrings that must never be deleted
 *   --collections=a,b       only scan these collections for references
 *   --force                 allow deleting more than half of a folder
 *
 * Add to package.json:  "cleanup:cloudinary": "node scripts/cleanupCloudinary.js"
 */

require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

try {
  require("dotenv").config();
} catch {
  /* dotenv not installed: rely on real environment variables */
}
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { runCleanup } = require("../services/cloudinaryCleanup");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const list = (v) =>
  typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

const uri = process.env.DATABASE_URI;

(async () => {
  if (!uri)
    throw new Error(
      "No database URI found (DATABASE_URI / MONGO_URI / MONGODB_URI).",
    );
  await mongoose.connect(uri);

  const report = await runCleanup({
    dryRun: !args.delete,
    minAgeHours: Number(args["min-age-hours"]) || 72,
    protect: list(args.protect) || [],
    collections: list(args.collections),
    force: !!args.force,
  });

  const file = path.join(
    process.cwd(),
    `cloudinary-cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  const bytes = report.folders.reduce(
    (n, f) => n + f.orphans.reduce((m, o) => m + o.bytes, 0),
    0,
  );
  const count = report.folders.reduce((n, f) => n + f.orphans.length, 0);
  console.log(
    `\n${count} orphaned asset(s), ${(bytes / 1024 / 1024).toFixed(1)} MB. Report: ${file}`,
  );
  if (report.dryRun)
    console.log(
      "DRY RUN: nothing was deleted. Review the report, then re-run with --delete.",
    );
})()
  .catch((err) => {
    console.error("Cleanup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
