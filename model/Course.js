const mongoose = require("mongoose");
const schema = mongoose.Schema;

const courseSchema = new schema({
  title: { type: String, required: [true, "A course title is required"] },
  description: {
    type: String,
    required: [true, "A course description is required"],
  },
  outline: {
    type: [{ title: String, file: String }],
    required: [true, "A course outline is required"],
  },
  materials: {
    type: [{ text: String, link: String }],
    default: [],
    required: [true, "A course materials is required"],
  },
  originalPrice: String,
  off: String,
  price: { type: Number, required: [true, "A course price is required"] },
});

module.exports = mongoose.model("Course", courseSchema);
