const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const manuscriptSchema = new Schema({
  name: { type: String, required: true },
  authorId: { type: String, required: true },
  email: { type: String, required: true },
  title: { type: String, required: true },
  journal: { type: String, required: true },
  abstract: { type: String, required: true },
  file: { type: String, required: true },
  country: { type: String, required: true },
  volume: { type: Number, default: 2026 - new Date().getFullYear() },
  issue: { type: Number, required: true },
});

module.exports.Accepted = mongoose.model(
  "AcceptedManuscript",
  manuscriptSchema
);
