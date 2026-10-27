/**
 * Usage (from the backend root):
 *   npm run cleanup:cloudinary                        dry run: lists what WOULD be deleted
 *   npm run cleanup:cloudinary -- --delete            really delete
 *   npm run cleanup:cloudinary -- --delete --force    also delete when the "more than half" guard trips
 *
 * Options:
 *   --min-age-hours=72      never touch assets newer than this (default 72)
 *   --protect=id1,id2       public_id substrings that must never be deleted
 *   --collections=a,b       only scan these collections for references
 *   --force                 allow deleting more than half of a folder
 *
 * A JSON report is ALWAYS written to the current folder (also for dry runs and blocked runs).
 */
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

try {
  require("dotenv").config();
} catch {
  /* dotenv not installed: rely on real environment variables */
}
const fs = require("fs");
const path = require("path");
const readline = require("readline");
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

const uri =
  process.env.DATABASE_URI || process.env.MONGO_URI || process.env.MONGODB_URI;

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    }),
  );
};

(async () => {
  if (!uri)
    throw new Error(
      "No database URI found (DATABASE_URI / MONGO_URI / MONGODB_URI).",
    );
  await mongoose.connect(uri);

  const cleanupOptions = {
    dryRun: !args.delete,
    minAgeHours: Number(args["min-age-hours"]) || 72,
    protect: list(args.protect) || [],
    collections: list(args.collections),
    force: !!args.force,
  };

  let report = await runCleanup(cleanupOptions);

  const file = path.resolve(
    `cloudinary-cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  const orphans = report.folders.flatMap((f) => f.orphans);
  const bytes = orphans.reduce((n, o) => n + o.bytes, 0);
  console.log(
    `\n${orphans.length} orphaned asset(s), ${(bytes / 1024 / 1024).toFixed(1)} MB.`,
  );
  console.log(`Report written to: ${file}`);

  if (report.blocked.length && !args.force) {
    console.log(
      "\nGuard tripped, so nothing is deleted. Review the report, then add --force if it is correct.",
    );
    if (!report.dryRun) process.exitCode = 2;
  } else if (report.dryRun) {
    if (orphans.length > 0 && process.stdin.isTTY) {
      console.log("\n--------------------------------------------------");
      const answer = await askQuestion(
        `Would you like to PERMANENTLY delete these ${orphans.length} orphaned asset(s) now? (y/N): `,
      );
      if (answer === "y" || answer === "yes") {
        console.log("\nExecuting deletion phase...");
        report = await runCleanup({
          ...cleanupOptions,
          dryRun: false,
        });
        console.log("\nDeletion completed successfully.");
      } else {
        console.log(
          "\nDRY RUN complete: nothing was deleted. Re-run with --delete to remove the orphans listed above.",
        );
      }
    } else {
      console.log(
        "\nDRY RUN: nothing was deleted. Re-run with --delete to remove the orphans listed above.",
      );
    }
  }
})()
  .catch((err) => {
    console.error("Cleanup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
