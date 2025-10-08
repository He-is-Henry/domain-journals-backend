const express = require("express");
const router = express.Router();
const resultController = require("../controller/resultController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const verifyCoursePayment = require("../middleware/verifyCoursePayment");

router.post(
  "/:examId",
  verifyJWT,
  verifyCoursePayment,
  resultController.evaluateExams
);
router.get(
  "/:courseId",
  verifyAdminJWT,
  verifyRoles("admin"),
  resultController.getResults
);

module.exports = router;
