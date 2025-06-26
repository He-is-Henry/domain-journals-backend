const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { Accepted } = require("./model/AcceptedManuscripts");
const { Manuscript } = require("./model/Manuscript");
require("dotenv").config();

connectDB();

mongoose.connection.on("connected", () => {
  console.log("✅ Connected to MongoDB");

  async function migrateManuscripts() {
    const docs = await Manuscript.find({});
    let updatedCount = 0;

    for (const doc of docs) {
      const $set = {};
      const $unset = {};

      // Rename name → author
      if (doc.name) {
        $set.author = doc.name;
        $unset.name = "";
      }

      // Add empty coAuthors if missing/invalid
      if (!Array.isArray(doc.coAuthors)) {
        $set.coAuthors = [];
      }

      // Convert under-review → screening
      if (doc.status === "under-review") {
        $set.status = "screening";
      }

      const update = {};
      if (Object.keys($set).length) update.$set = $set;
      if (Object.keys($unset).length) update.$unset = $unset;

      if (Object.keys(update).length) {
        await Manuscript.updateOne({ _id: doc._id }, update);
        console.log(`[manuscripts] Updated: ${doc._id}`);
        updatedCount++;
      }
    }

    console.log(`✅ manuscripts: ${updatedCount} documents updated.`);
  }

  (async () => {
    try {
      await migrateManuscripts();
      console.log("✅ Migration complete.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    }
  })();
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});
