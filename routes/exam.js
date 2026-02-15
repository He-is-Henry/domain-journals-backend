const express = require("express");
const router = express.Router();
const examsController = require("../controller/examsController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const verifyCoursePayment = require("../middleware/verifyCoursePayment");

router.post(
  "/",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.createExam,
);
router.get(
  "/all",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.getAllExamsDetails,
);

router.get(
  "/all/:courseId",
  verifyJWT,
  verifyCoursePayment,
  examsController.viewCourseExams,
);

router.get(
  "/view/:examId",
  verifyJWT,
  verifyCoursePayment,
  examsController.viewExam,
);
router.get(
  "/send/:examId",
  verifyJWT,
  verifyCoursePayment,
  examsController.sendExam,
);
router.get(
  "/revise/:examId",
  verifyJWT,
  verifyCoursePayment,
  examsController.reviseExam,
);
router.get(
  "/:examId",
  verifyJWT,
  verifyCoursePayment,
  examsController.takeExam,
);

router.patch(
  "/:examId",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.editExam,
);

router.delete(
  "/:examId",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.deleteExam,
);

module.exports = router;
