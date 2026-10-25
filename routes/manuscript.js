const express = require("express");
const router = express.Router();
const manuscriptController = require("../controller/manuscriptController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");

// Base Collection Routes
router
  .route("/")
  .post(verifyJWT, manuscriptController.addManuscript)
  .get(verifyAdminJWT, manuscriptController.getAllManuscripts);

// Specific Query Routes (Must come before generic /:id wildcards)
router.get("/getByUser", verifyJWT, manuscriptController.getUserManuscript);
router.get(
  "/verify/payment/:paymentReference",
  manuscriptController.getManuscriptByReference,
);

router.get("/verify/:token", manuscriptController.getManuscriptByToken);

// Admin Screening & Manuscript Management Actions
router.patch(
  "/screen/:id",
  verifyAdminJWT,
  verifyRoles("admin"),
  manuscriptController.handleManuscriptScreened,
);

router
  .route("/admin/:id")
  .delete(verifyAdminJWT, manuscriptController.deleteManuscriptByAdmin)
  .patch(verifyAdminJWT, manuscriptController.editManuscriptFile);

router.patch(
  "/:id/approve",
  verifyAdminJWT,
  manuscriptController.approveManuscript,
);
router.patch(
  "/:id/remind",
  verifyAdminJWT,
  manuscriptController.sendReminderEmail,
);
router.patch(
  "/:id/paid",
  verifyAdminJWT,
  verifyRoles("admin"),
  manuscriptController.handleManuscriptPaid,
);
router.patch(
  "/:id/revoke",
  verifyAdminJWT,
  manuscriptController.revokeAcceptance,
);
router.patch(
  "/:id/reject",
  verifyAdminJWT,
  manuscriptController.rejectManuscript,
);

// Standard ID-based Manuscript Operations (Protected for Authenticated Authors)
router
  .route("/:id")
  .get(manuscriptController.getManuscript)
  .patch(verifyJWT, manuscriptController.editManuscript)
  .delete(verifyJWT, manuscriptController.deleteManuscript);

// Legacy Token-based Operations (Fallback support)
router
  .route("/token/:token")
  .patch(manuscriptController.editManuscript)
  .delete(manuscriptController.deleteManuscript);

module.exports = router;
