const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const manuscriptSchema = new Schema({
  name: { type: String, required: true },
  authorId: String,
  email: { type: String, required: true },
  title: { type: String, required: true },
  journal: { type: String, required: true },
  abstract: { type: String, required: true },
  file: { type: String, required: true },
  country: { type: String, required: true },
  volume: { type: Number, default: 2026 - new Date().getFullYear() },
  status: {
    type: String,
    enum: ["under-review", "approved", "paid", "rejected"],
    default: "under-review",
    required: true,
  },
  comment: String,
  rejectedBy: String,
  paymentReference: String,
});

module.exports.Manuscript = mongoose.model("Manuscript", manuscriptSchema);
