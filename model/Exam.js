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
    attempts: [{ user: schema.Types.ObjectId, startTime: Date }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
