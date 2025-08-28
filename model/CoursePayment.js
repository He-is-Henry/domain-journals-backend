const mongoose = require("mongoose");
const schema = mongoose.Schema;

const coursePaymentSchema = new schema(
  {
    user: {
      type: schema.Types.ObjectId,
      ref: "Author",
      required: [true, "User is required"],
    },
    course: {
      type: schema.Types.ObjectId,
      ref: "Course",
      required: [true, "A course is required"],
    },
    confirmed: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coursepayment", coursePaymentSchema);
