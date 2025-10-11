const CoursePayment = require("../model/CoursePayment");

const verifyCoursePayment = async (req, res, next) => {
  try {
    const { courseId: course } = req.params;
    const user = req.userId;
    const payment = await CoursePayment.findOne({ user, course });
    if (!payment || !payment.confirmed) req.paid = false;
    else req.paid = true;
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports = verifyCoursePayment;
