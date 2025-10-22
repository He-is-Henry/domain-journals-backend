const CoursePayment = require("../model/CoursePayment");
const Exam = require("../model/Exam");

const verifyCoursePayment = async (req, res, next) => {
  try {
    let { courseId: course, examId } = req.params;
    let exam;
    if (!course) {
      exam = await Exam.findById(examId);
      course = exam.course;
    }
    const user = req.userId;
    console.log(user);
    const payment = await CoursePayment.findOne({ user, course });
    console.log(payment);
    if (!payment || !payment.confirmed) req.paid = false;
    else req.paid = true;
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports = verifyCoursePayment;
