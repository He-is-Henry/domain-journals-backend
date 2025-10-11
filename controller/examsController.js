const Draft = require("../model/Draft");
const Exam = require("../model/Exam");
const Result = require("../model/Result");
const { deleteDraft } = require("./resultController");
const { finalizeResults } = require("./resultController");

const removeAnswers = (questions) => {
  return questions.map((q) => ({ ...q, correctAnswer: null }));
};
const createExam = async (req, res) => {
  try {
    let { course, duration, description, questions } = req.body;
    if (!course || !duration || !description || !Array.isArray(questions))
      throw new Error("invalid data");
    if (isNaN(duration)) duration = Number(duration);
    const exam = await Exam.create({
      course,
      duration,
      description,
      questions,
    });
    res.json(exam);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const viewExam = async (req, res) => {
  try {
    if (!req.paid) throw new Error("User hasn't paid yet");
    const { courseId } = req.params;
    const exam = await Exam.findOne({ course: courseId });
    if (!exam) throw new Error("Exam doesn't exist for this course");
    const examObj = exam.toObject();
    examObj.count = examObj.questions.length;
    delete examObj.questions;
    res.json(examObj);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
const sendExam = async (req, res) => {
  try {
    if (!req.paid) throw new Error("User hasn't paid yet");
    const { courseId } = req.params;
    const exam = await Exam.findOne({ course: courseId });
    if (!exam) throw new Error("Exam doesn't exist for this course");
    res.json(exam.toObject());
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const getAllExamsDetails = async (req, res) => {
  try {
    const allExams = await Exam.find();
    res.json(allExams);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const getExam = async (req, res) => {
  const user = req.userId;
  try {
    if (!req.paid) throw new Error("User hasn't paid yet");

    const { courseId } = req.params;
    const exam = await Exam.findOne({ course: courseId });
    if (!exam) throw new Error("Exam not found");

    // Already submitted?
    const alreadySubmitted = await Result.findOne({ exam: exam._id, user });
    if (alreadySubmitted) throw new Error("You already took this test");

    // Find existing attempt
    const attempt = exam.attempts.find(
      (a) => a?.user.toString() === user.toString()
    );

    const now = new Date();

    if (!attempt) {
      exam.attempts.push({ user, startTime: now });
      await exam.save();
    } else {
      const draft = await Draft.findOne({ user, exam: exam._id });
      const answers = draft?.answers || [];
      const startTime = attempt.startTime;
      const endTime = new Date(startTime.getTime() + exam.duration * 60000);

      // Time’s up
      if (now > endTime) {
        const { score, calculations } = finalizeResults(
          exam.questions,
          answers
        );
        const result = await Result.create({
          user,
          exam: exam._id,
          questions: calculations,
          score,
          totalScore: exam.questions.length,
        });
        await deleteDraft(exam._id, user);
        return res.status(400).json({
          score: `${score}/${exam.questions.length}`,
          calculations,
          error: "Time's up, please go to profile > results to see your score",
        });
      }

      // Still within time
      return res.json({
        ...exam.toObject(),
        questions: removeAnswers(exam.toObject().questions),
        now,
        endTime,
      });
    }

    const endTime = new Date(now.getTime() + exam.duration * 60000);
    return res.json({
      ...exam.toObject(),
      questions: removeAnswers(exam.toObject().questions),
      now,
      endTime,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const editExam = async (req, res) => {
  try {
    const { examId } = req.params;
    let { duration, description, questions } = req.body;
    if (!examId || !duration || !description || !Array.isArray(questions))
      throw new Error("invalid data");
    if (isNaN(duration)) duration = Number(duration);
    const exam = await Exam.findById(examId).lean();
    exam.duration = duration;
    exam.description = description;
    exam.questions = questions;
    await exam.save();
    res.json(exam);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await Exam.findByIdAndDelete(examId);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createExam,
  getExam,
  editExam,
  deleteExam,
  viewExam,
  getAllExamsDetails,
  sendExam,
};
