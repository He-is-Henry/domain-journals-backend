const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = Schema({
  authorId: { type: String, required: true },
  dateTime: { type: Date, default: new Date().toISOString() },
  text: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false },
});

module.exports.Review = mongoose.model("Review", reviewSchema);
