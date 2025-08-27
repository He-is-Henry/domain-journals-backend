const Author = require("../model/Author");
const Course = require("../model/Course");
const CoursePayment = require("../model/CoursePayment");
const sendMail = require("../uttils/sendMail");

const addCourse = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { title, description, outline, price, originalPrice } = req.body;
    let off;
    if (originalPrice) {
      const diff = originalPrice - price;
      off = (diff / originalPrice) * 100;
    }
    const course = await Course.create({
      title,
      description,
      outline,
      price,
      originalPrice,
      off,
    });
    res.json(course);
  } catch (err) {
    console.log(err);
  }
};

const editCourse = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { title, description, outline, price, originalPrice } = req.body;
    const { courseId } = req.params;
    const course = await Course.find(courseId);
    let off;
    if (originalPrice) {
      const diff = originalPrice - price;
      off = (diff / originalPrice) * 100;
    }
    if (title) course.title = title;
    if (description) course.description = description;
    if (outline) course.outline = outline;
    if (price) course.price = price;
    if (originalPrice) course.originalPrice = originalPrice;
    if (originalPrice) course.off = off;
    const result = await course.save();
    res.json(result);
  } catch (err) {
    console.log(err);
  }
};

const handleCoursePayment = async (req, res) => {
  try {
    const { course } = req.params;
    const user = req.userId;
    const author = await Author.findById(user);
    const { title, price } = await Course.findById(course);
    const existingPayment = await CoursePayment.find({ user, course });
    if (existingPayment)
      return res
        .status(409)
        .json({ error: "You already initiated a payment for this course" });
    await sendMail({
      to: author.email,
      subject: `Your payment of ${price} for "${title}" has been initiated!`,
      text: "Your payment has been initiated and we're now confirming your payment.",
      html: `<p> Your payment of ${price} for "${title}"  has been initiated and we're now confirming your payment. We will reach out to you as soon as possible </p>`,
    });
    const payment = await CoursePayment.create(user, course);
    res.json(payment);
  } catch (err) {
    console.log(err);
  }
};

const confirmPayment = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { paymentId } = req.params;
    const payment = await CoursePayment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    const { price, title } = await Course.findById(payment.course);

    const author = await Author.findById(payment.user);

    await sendMail({
      to: author.email,
      subject: `Your payment of ${price} for "${title}" has been confirmed!`,
      text: "Your payment has been confirmed, Thank you for choosing us.",
      html: `<p> Your payment of ${price} for "${title}"  has been confirmed, Thank you for choosing us.</p>`,
    });
    payment.confirmed = true;
    await payment.save();
  } catch (err) {
    console.log(err);
  }
};

const getCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course)
      return res.status(400).json({ error: "Course not found, check ID" });
    const paid = req.paid;
    course.outline = paid
      ? course.outline
      : course.outline.map((item) => (item.file = undefined));
    res.json(course);
  } catch (err) {
    console.log(err);
  }
};

const determinePaymentStatus = async (course, user) => {
  const payment = await CoursePayment.find({ course, user });
  if (!payment) return false;
  if (payment?.confirmed) return true;
  else return false;
};

const getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find();
    const courses = allCourses.map(async (course) => {
      course.paid = await determinePaymentStatus(course._id, req.userId);
      const paid = course.paid;
      course.outline = paid
        ? course.outline
        : course.outline.map((item) => (item.file = undefined));
      return course;
    });
    res.json(courses);
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  addCourse,
  editCourse,
  getAllCourses,
  handleCoursePayment,
  confirmPayment,
  getCourse,
};
