const express = require("express");
const router = express.Router();
const resultController = require("../controller/resultController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");
const verifyCoursePayment = require("../middleware/verifyCoursePayment");

router.get("/all", verifyJWT, resultController.getUserResults);
router.post(
  "/:examId",
  verifyJWT,
  verifyCoursePayment,
  resultController.evaluateExams,
);
router.get(
  "/",
  verifyAdminJWT,
  verifyRoles("admin"),
  resultController.getResults,
);
router.get(
  "/:examId",
  verifyAdminJWT,
  verifyRoles("admin"),
  resultController.getResult,
);
router.delete(
  "/:id",
  verifyAdminJWT,
  verifyRoles("admin"),
  resultController.deleteResult,
);

router.get("/single/:examId", verifyJWT, resultController.getResult);

module.exports = router;
