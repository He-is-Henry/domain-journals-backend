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
  outlineHeading: {
    type: String,
    default: "Course Outline",
    required: true,
  },
  materials: {
    type: [{ text: String, link: String }],
    default: [],
    required: [true, "Course materials are required"],
  },
  materialsHeading: {
    type: String,
    default: "Materials",
    required: true,
  },
  texts: {
    type: [{ title: String, text: String }],
    default: [],
    required: [true, "Course texts are required"],
  },
  textsHeading: {
    type: String,
    default: "Texts",
    required: true,
  },
  originalPrice: String,
  off: String,
  price: { type: Number, required: [true, "A course price is required"] },
});

module.exports = mongoose.model("Course", courseSchema);
