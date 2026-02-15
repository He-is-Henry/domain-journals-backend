const Draft = require("../model/Draft");
const Exam = require("../model/Exam");
const Result = require("../model/Result");

const deleteDraft = async (exam, user) => {
  return await Draft.findOneAndDelete({ exam, user });
};

const finalizeResults = (questions, answers) => {
  let score = 0;
  const calculations = questions.map((q, i) => {
    const answer = answers[i]?.answerIndex;
    const correct = q.correctAnswer === answer;
    if (correct) score++;
    return {
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      answer,
      explanation: q.explanation,
      correct,
    };
  });
  const correctAnswers = calculations.filter((r) => r.correct);
  if (correctAnswers.length !== score)
    throw new Error(
      `${{ correctAnswersLength: correctAnswers.length, score }}`,
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
      (a) => a?.user.toString() === user.toString(),
    );

    if (!attempt)
      throw new Error(
        "You are not allowed to submit because there was not former attempt made",
      );

    await exam.save();
    const now = new Date();
    const endTime = new Date(
      new Date(attempt.startTime).getTime() + exam.duration * 60000,
    );
    const graceEndTime = new Date(endTime.getTime() + 60000 * 5);
    console.log(graceEndTime.toLocaleTimeString());

    if (now > graceEndTime) {
      throw new Error(
        "Submitted — exam time has elapsed, find result on profile > my results",
      );
    }

    if (!exam) throw new Error("Exam not found");
    const questions = exam.questions;
    const totalScore = questions.length;
    const { score, calculations } = finalizeResults(questions, answers);
    const alreadySubmitted = await Result.findOne({ exam: examId, user });
    if (alreadySubmitted) return new Error("You already took this test");
    exam.attempts.filter((a) => a.user !== user);
    await exam.save();
    const results = await Result.create({
      user,
      exam: examId,
      questions: calculations,
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
    const results = await Result.find().populate(
      "user",
      "name level department matricNumber",
    );
    console.log(results);
    res.json(results);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const getUserResults = async (req, res) => {
  const user = req.userId;
  const results = await Result.find({ user }).populate(
    "exam",
    "description canReview",
  );
  results.forEach((r) => {
    const canReview = r.exam.canReview;
    if (!canReview) r.questions = undefined;
    return r;
  });
  res.json(results);
};

const getResult = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    const description = exam.description;
    const results = await Result.find({ exam: examId }).populate(
      "user",
      "name level department matricNumber",
    );
    if (!results) {
      return res.status(404).json({ error: "Results not found" });
    }
    const response = { description, results };

    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const deleteResult = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Invalid data" });
    const result = await Result.findById(id);

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }
    const user = result.user;
    const exam = result.exam;

    await deleteDraft(exam, user);
    await result.deleteOne();
    const results = await Result.find().populate(
      "user",
      "name level department matricNumber",
    );
    res.json({ message: "Result deleted succesfully", results });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  evaluateExams,
  getResults,
  getResult,
  finalizeResults,
  getUserResults,
  deleteDraft,
  deleteResult,
};
