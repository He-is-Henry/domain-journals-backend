const mongoose = require("mongoose");
const schema = mongoose.Schema;

const draftSchema = new schema(
  {
    exam: { type: schema.Types.ObjectId, ref: "Exam", required: true },
    user: { type: schema.Types.ObjectId, ref: "Author", required: true },
    answers: [
      {
        questionIndex: Number,
        answerIndex: Number,
      },
    ],
    currentQuestion: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    startTime: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Draft", draftSchema);
