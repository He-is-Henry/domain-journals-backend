const Exam = require("../model/Exam");
const Result = require("../model/Result");

const deleteDraft = async (exam, user) => {
  const draft = await Result.findOne({ exam, user });
  return await Result.deleteOne();
};

const finalizeResults = (questions, answers) => {
  let score = 0;
  const calculations = questions.map((q, i) => {
    const userAnswer = answers[i]?.answerIndex;
    const correct = q.correctAnswer === userAnswer;
    if (correct) score++;
    return {
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      userAnswer,
      correct,
    };
  });
  const correctAnswers = calculations.filter((r) => r.correct);
  if (correctAnswers.length !== score)
    throw new Error(
      `${{ correctAnswersLength: correctAnswers.length, score }}`
    );

  return { score, calculations };
};
const evaluateExams = async (req, res) => {
  try {
    const user = req.userId;
    const { examId } = req.params;
    const { answers } = req.body;
    const exam = await Exam.findById(examId);
    const attempt = exam.attempts.find(
      (a) => a?.user.toString() === user.toString()
    );

    if (!attempt)
      throw new Error(
        "You are not allowed to submit because there was not former attempt made"
      );

    const now = new Date();
    const endTime = new Date(attempt.startTime + exam.duration * 60000);
    const graceEndTime = new Date(endTime.getTime() + 60000 * 5);
    console.log(graceEndTime.toLocaleTimeString());

    if (now > graceEndTime) {
      throw new Error("Submission too late — exam time has elapsed");
    }

    if (!exam) throw new Error("Exam not found");
    const questions = exam.questions;
    const totalScore = questions.length;
    const { score, calculations } = finalizeResults(questions, answers);
    const results = await Result.create({
      user,
      exam: examId,
      questions,
      score,
      totalScore,
    });
    await deleteDraft(examId, user);
    console.log(results);
    res.json({
      score: `${score}/${totalScore}`,
      calculations,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const getResults = async (req, res) => {
  try {
    const { courseId: course } = req.params;
    const results = await Result.find({ course }).populate(
      "user",
      "name email"
    );

    res.json(results);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
module.exports = { evaluateExams, getResults, finalizeResults };
