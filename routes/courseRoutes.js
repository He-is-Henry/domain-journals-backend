const express = require("express");
const router = express.Router();
const courseController = require("../controller/courseController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");

router.get("/", courseController.getAllCourses);
router.post("/", verifyAdminJWT, courseController.addCourse);
router.post("/pay/:course", verifyJWT, courseController.handleCoursePayment);
router.patch("/:paymentId", verifyAdminJWT, courseController.confirmPayment);
router.put("/courseId", verifyAdminJWT, courseController.editCourse);
router.get("/:courseId", courseController.getCourse);

module.exports = router;
