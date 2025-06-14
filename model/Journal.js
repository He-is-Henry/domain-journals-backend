const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const journalSchema = new Schema({
  name: { type: String, required: true },
  issue: { type: Number, required: true },
});

module.exports.Journal = mongoose.model("journal", journalSchema);
