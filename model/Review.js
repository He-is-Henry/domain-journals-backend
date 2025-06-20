const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = Schema({
  authorId: { type: String },
  dateTime: { type: Date, default: new Date().toISOString() },
  text: { type: String, required: true },
});

module.exports.Review = mongoose.model("Review", reviewSchema);
