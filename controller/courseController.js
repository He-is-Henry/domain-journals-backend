const Author = require("../model/Author");
const Course = require("../model/Course");
const CoursePayment = require("../model/CoursePayment");
const sendMail = require("../uttils/sendMail");

const addCourse = async (req, res) => {
  try {
    const isAdmin = req.role === "admin";
    if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });
    const {
      title,
      description,
      outline,
      outlineHeading,
      materialsHeading,
      textsHeading,
      materials,
      texts,
      price,
      originalPrice,
    } = req.body;
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
      outlineHeading,
      materialsHeading,
      textsHeading,
      outline,
      materials,
      texts,
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
    const {
      title,
      description,
      outline,
      outlineHeading,
      materialsHeading,
      textsHeading,
      materials,
      texts,
      price,
      originalPrice,
    } = req.body;
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate({
      path: "exams",
      select: "description",
    });

    let off;
    if (originalPrice) {
      const diff = originalPrice - price;
      off = (diff / originalPrice) * 100;
    }
    if (title) course.title = title;
    if (description) course.description = description;
    if (outlineHeading) course.outlineHeading = outlineHeading;
    if (materialsHeading) course.materialsHeading = materialsHeading;
    if (textsHeading) course.textsHeading = textsHeading;
    if (outline) course.outline = outline;
    if (materials) course.materials = materials;
    if (texts) course.texts = texts;
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

    await sendMail({
      to: "domainjournals.dev@gmail.com",
      subject: "A payment has been made",
      text: `${author.name} just made a payment of ${courseData.price} for "${courseData.title}". Verify this`,
      html: `
<div style="font-family: Arial, sans-serif; background: #f7f9f7; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; border: 1px solid #e2e8e2;">
    
    <h2 style="color: #093238; margin-top: 0;">New Course Payment Alert</h2>

    <p style="font-size: 15px; color: #333;">
      Hello Admin,
    </p>

    <p style="font-size: 15px; color: #333;">
      A user has initiated a payment for one of the courses on <b>Domain Journals</b>. Here are the details:
    </p>

    <div style="background: #f1f8e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #659377;">
      <p style="margin: 5px 0; font-size: 15px;"><b>User:</b> ${author.name}</p>
      <p style="margin: 5px 0; font-size: 15px;"><b>Course:</b> ${courseData.title}</p>
      <p style="margin: 5px 0; font-size: 15px;"><b>Amount:</b> ₦${courseData.price}</p>
      <p style="margin: 5px 0; font-size: 15px;"><b>Email:</b> ${author.email}</p>
    </div>

    <p style="font-size: 15px; color: #333;">
      Please log in to the admin dashboard to verify this payment.
    </p>

    <a href="https://www.domainjournals.com/admin/payments"
       style="display: inline-block; margin-top: 15px; background: #659377; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-size: 15px;">
      Review Payment
    </a>

    <p style="font-size: 13px; color: #777; margin-top: 30px;">
      This is an automated notification from Domain Journals.
    </p>
  </div>
</div>`,
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
    if (!isAdmin)
      return res.status(401).json({ error: "Unauthorized" + req.role });
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
    const isAdmin = req.role === "your dashboardadmin";
    if (!isAdmin)
      return res.status(401).json({ error: "Unauthorized" + req.role });
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
    const course = await Course.findById(courseId)
      .populate({
        path: "exams",
        select: "description",
      })
      .lean();
    if (!course)
      return res.status(400).json({ error: "Course not found, check ID" });
    const paid = req.paid;
    course.paid = paid;
    console.log(paid);
    if (!paid) {
      course.outline = course.outline.map((item) => ({
        ...item,
        file: undefined,
      }));
      course.materials = (course.materials || []).map((material) => ({
        text: material.text,
        link: undefined,
      }));
    }

    res.json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", err });
  }
};

const getCourseByAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).lean();
    if (!course)
      return res.status(400).json({ error: "Course not found, check ID" });

    res.json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", err });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await Course.findByIdAndDelete(courseId);
    res.json(result);
  } catch (err) {
    console.log(err);
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
    const allCourses = await Course.find()
      .populate({
        path: "exams",
        select: "description",
      })
      .lean();

    const courses = await Promise.all(
      allCourses.map(async (course) => {
        const paid = await determinePaymentStatus(course._id, req.userId);

        return {
          ...course,
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
  getCourseByAdmin,
  getPayments,
  deletePayment,
  deleteCourse,
};
