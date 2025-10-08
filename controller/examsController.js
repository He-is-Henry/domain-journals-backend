const Exam = require("../model/Exam");

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
    }).lean();
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

const getExam = async (req, res) => {
  try {
    if (!req.paid) throw new Error("User hasn't paid yet");
    const { courseId } = req.params;
    console.log(courseId, "68afe2c1b11b5682581d34aa");
    const exam = await Exam.findOne({ course: courseId });

    if (exam.attempts.find((a) => a?.user.toString() === req.userId.toString()))
      throw new Error("User has already attempted");

    console.log(exam.attempts);
    console.log(req.userId);
    const now = new Date();
    const endTime = new Date(now.getTime() + exam.duration * 60000);
    exam.attempts.push({ user: req.userId, startTime: now });
    await exam.save();
    res.json({ ...exam.toObject(), now, endTime });
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
};
