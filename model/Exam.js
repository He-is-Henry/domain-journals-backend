const mongoose = require("mongoose");
const schema = mongoose.Schema;

const examSchema = new schema(
  {
    course: { type: schema.Types.ObjectId, ref: "course", required: true },
    description: String,
    duration: Number,
    questions: [
      {
        text: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: Number,
        explanation: String,
      },
    ],
    locked: {
      type: Boolean,
      default: false,
    },
    canReview: {
      type: Boolean,
      default: true,
    },
    attempts: [
      { user: schema.Types.ObjectId, startTime: Date, submitted: Boolean },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Exam", examSchema);
