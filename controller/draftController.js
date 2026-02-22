const Draft = require("../model/Draft");
const Exam = require("../model/Exam");
const Result = require("../model/Result");
const { finalizeResults } = require("./resultController");

const saveDraft = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    const userId = req.userId;
    const { answers, currentQuestion } = req.body;
    const attempt = exam.attempts.find(
      (a) => a?.user.toString() === userId.toString(),
    );
    if (!attempt) throw new Error("No attempt found for this user");

    const startTime = new Date(attempt.startTime);
    const endTime = new Date(startTime.getTime() + exam.duration * 60000); // add duration
    const now = new Date();

    let draft = await Draft.findOne({ exam: examId, user: userId });
    if (now > endTime) {
      console.log("Time elapsed, auto-submitting...");

      const lastDraft = await Draft.findOne({ exam: examId, user: userId });

      if (lastDraft && !lastDraft.completed) {
        lastDraft.completed = true;
        await lastDraft.save();
        const questions = exam.questions;
        const { score, calculations } = finalizeResults(questions, answers);
        const results = await Result.create({
          userId,
          exam: examId,
          questions: calculations,
          score,
          totalScore: questions.length,
        });
        await this.deleteDraft(examId, userId);
        exam.attempts.filter((a) => a.user !== userId);
        await exam.save();
        console.log(results);
        return res.json({
          score: `${score}/${questions.length}`,
          calculations,
        });
      }

      return res.status(403).json({
        error: "Time is up. Your exam has been auto-submitted.",
      });
    }

    if (!draft) {
      draft = await Draft.create({
        exam: examId,
        user: userId,
        answers,
        startTime,
        currentQuestion,
      });
    } else {
      draft.answers = answers;
      draft.currentQuestion = currentQuestion;
      await draft.save();
    }

    res.json({ message: "Draft saved", startTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getDraft = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.userId;
    const draft = await Draft.findOne({ exam: examId, user: userId });

    if (!draft) return res.status(404).json({ message: "No draft found" });
    res.json(draft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const markCompleted = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.userId;
    const draft = await Draft.findOne({ exam: examId, user: userId });
    if (!draft) throw new Error("No draft found");
    draft.completed = true;
    await draft.save();
    res.json({ message: "Draft marked as completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDraft,
  saveDraft,
  markCompleted,
};
