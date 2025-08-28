const Author = require("../model/Author");
const Course = require("../model/Course");
const CoursePayment = require("../model/CoursePayment");
const sendMail = require("../uttils/sendMail");

const addCourse = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { title, description, outline, materials, price, originalPrice } =
      req.body;
    let off;
    if (originalPrice) {
      if (originalPrice < price)
        return res.status(400).json({
          error: "Original price cannot be less than current price",
        });
      const diff = originalPrice - price;
      off = (diff / originalPrice) * 100;
    }
    const course = await Course.create({
      title,
      description,
      outline,
      materials,
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
    const { title, description, outline, materials, price, originalPrice } =
      req.body;
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    let off;
    if (originalPrice) {
      const diff = originalPrice - price;
      off = (diff / originalPrice) * 100;
    }
    if (title) course.title = title;
    if (description) course.description = description;
    if (outline) course.outline = outline;
    if (materials) course.materials = materials;
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
    if (!author) return res.status(404).json({ error: "User not found" });

    const courseData = await Course.findById(course);
    if (!courseData) return res.status(404).json({ error: "Course not found" });

    const existingPayment = await CoursePayment.findOne({ user, course });
    if (existingPayment)
      return res
        .status(409)
        .json({ error: "You already initiated a payment for this course" });

    const payment = await CoursePayment.create({ user, course });
    res.json({ message: "Payment initiated successfully", payment });

    await sendMail({
      to: author.email,
      subject: `Your payment of ${courseData.price} for "${courseData.title}" has been initiated!`,
      text: "Your payment has been initiated and we're now confirming it.",
      html: `<p>Your payment of ${courseData.price} for "<b>${courseData.title}</b>" has been initiated and we're now confirming your payment. We will reach out to you as soon as possible.</p>`,
    });
  } catch (err) {
    console.error("Payment Error:", err);
    res
      .status(500)
      .json({ error: "Something went wrong while processing payment" });
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

    payment.confirmed = true;
    await payment.save();
    res.json({ message: "Confirmed" });

    await sendMail({
      to: author.email,
      subject: `Your payment of ${price} for "${title}" has been confirmed!`,
      text: "Your payment has been confirmed, Thank you for choosing us.",
      html: `<p> Your payment of ${price} for "${title}"  has been confirmed, Thank you for choosing us.</p>`,
    });
  } catch (err) {
    console.log(err);
  }
};
const deletePayment = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const { paymentId } = req.params;
    const result = await CoursePayment.findByIdAndDelete(paymentId);

    res.json(result);
  } catch (err) {
    console.log(err);
  }
};

const getCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course)
      return res.status(400).json({ error: "Course not found, check ID" });

    const paid = req.paid;

    if (!paid) {
      course.outline = course.outline.map((item) => ({
        ...item,
        file: undefined,
      }));

      course.materials = course.materials.map((material) => ({
        ...material,
        link: undefined,
      }));
    }

    res.json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", err });
  }
};

const determinePaymentStatus = async (course, user) => {
  console.log({ course, user });
  const payment = await CoursePayment.findOne({ course, user });
  console.log(payment);
  if (!payment) return false;
  if (payment?.confirmed) return true;
  else return false;
};

const getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find();

    const courses = await Promise.all(
      allCourses.map(async (course) => {
        const paid = await determinePaymentStatus(course._id, req.userId);

        return {
          ...course.toObject(),
          paid,
          outline: paid
            ? course.outline
            : course.outline.map((item) => ({
                title: item.title,
                file: undefined,
              })),
          materials: paid
            ? course.materials
            : course.materials.map((material) => ({
                ...material,
                link: undefined,
              })),
        };
      })
    );

    res.json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await CoursePayment.find()
      .populate("user", "name email")
      .populate("course", "title price");
    res.json(payments);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong getting payments" });
  }
};

module.exports = {
  addCourse,
  editCourse,
  getAllCourses,
  handleCoursePayment,
  confirmPayment,
  getCourse,
  getPayments,
  deletePayment,
};
