const mongoose = require("mongoose");
const schema = mongoose.Schema;

const resultsSchema = new schema(
  {
    user: {
      type: schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    exam: {
      type: schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "An exam id is required"],
    },
    questions: {
      type: [
        {
          text: String,
          correctAnswer: String,
          Answer: String,
        },
      ],
      required: true,
    },
    score: { type: Number, required: true },
    totalScore: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultsSchema);
