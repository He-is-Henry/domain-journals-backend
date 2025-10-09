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
  examsController.createExam
);
router.get(
  "/all",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.getAllExamsDetails
);
router.get(
  "/view/:courseId",
  verifyJWT,
  verifyCoursePayment,
  examsController.viewExam
);
router.get(
  "/send/:courseId",
  verifyJWT,
  verifyCoursePayment,
  examsController.sendExam
);
router.get(
  "/:courseId",
  verifyJWT,
  verifyCoursePayment,
  examsController.getExam
);

router.patch(
  "/:examId",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.editExam
);

router.delete(
  "/:examId",
  verifyAdminJWT,
  verifyRoles("admin"),
  examsController.deleteExam
);

module.exports = router;
