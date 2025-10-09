const Exam = require("../model/Exam");
const Result = require("../model/Result");

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
    const { questions, ...viewable } = exam.toObject();
    res.json({ ...viewable, count: exam.questions.length });
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
  try {
    console.log("Here!");
    if (!req.paid) throw new Error("User hasn't paid yet");
    const { courseId } = req.params;
    const exam = await Exam.findOne({ course: courseId });

    const alreadySubmitted = await Result.findOne({
      exam: exam._id,
      user: req.userId,
    });
    console.log({ alreadySubmitted });
    if (alreadySubmitted) throw new Error("You already took this test");
    console.log(exam.attempts);
    console.log(req.userId);
    const now = new Date();
    const endTime = new Date(now.getTime() + exam.duration * 60000);
    const attempt = exam.attempts.find(
      (a) => a?.user.toString() === req.userId.toString()
    );
    console.log({ attempt });
    if (!attempt) {
      exam.attempts.push({ user: req.userId, startTime: now });
      await exam.save();
    } else {
      const now = attempt.startTime;
      const endTime = new Date(now.getTime() + exam.duration * 60000);
      console.log({ ...exam.toObject(), now, endTime });
      return res.json({
        ...exam.toObject(),
        questions: removeAnswers(exam.toObject().questions),
        now,
        endTime,
      });
    }
    res.json({
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
    const { duration, description, questions } = req.body;
    if (!course || !duration || !description || !Array.isArray(questions))
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
