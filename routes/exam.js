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
