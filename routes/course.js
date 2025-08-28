const express = require("express");
const router = express.Router();
const courseController = require("../controller/courseController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");

router.get("/", verifyJWT, courseController.getAllCourses);
router.post("/", verifyAdminJWT, courseController.addCourse);
router.get("/payments", verifyAdminJWT, courseController.getPayments);
router.delete("/:paymentId", verifyAdminJWT, courseController.deletePayment);
router.post("/pay/:course", verifyJWT, courseController.handleCoursePayment);
router.patch("/:paymentId", verifyAdminJWT, courseController.confirmPayment);
router.put("/courseId", verifyAdminJWT, courseController.editCourse);
router.get("/:courseId", courseController.getCourse);
router.get(
  "/admin/:courseId",
  verifyAdminJWT,
  courseController.getCourseByAdmin
);

module.exports = router;
