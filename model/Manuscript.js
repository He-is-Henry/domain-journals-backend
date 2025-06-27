const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const manuscriptSchema = new Schema({
  author: { type: String, required: true },
  coAuthors: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
  ],
  authorId: String,
  email: { type: String, required: true },
  title: { type: String, required: true },
  journal: { type: String, required: true },
  abstract: { type: String, required: true },
  file: { type: String, required: true },
  country: { type: String, required: true },
  volume: { type: Number, default: new Date().getFullYear() - 2024 },
  status: {
    type: String,
    enum: ["screening", "under-review", "approved", "paid", "rejected"],
    default: "screening",
    required: true,
  },
  comment: String,
  rejectedBy: String,
  paymentReference: String,
});

module.exports.Manuscript = mongoose.model("Manuscript", manuscriptSchema);
