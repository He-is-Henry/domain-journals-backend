const mongoose = require("mongoose");
const schema = mongoose.Schema;

const coursePaymentSchema = new schema({
  user: { type: String, required: [true, "User is required"] },
  course: { type: String, required: [true, "A course is required"] },
  confirmed: { type: Boolean, required: true, default: false },
});

module.exports = mongoose.model("Course", coursePaymentSchema);
