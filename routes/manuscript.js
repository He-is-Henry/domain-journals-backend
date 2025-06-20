const express = require("express");
const router = express.Router();
const manuscriptController = require("../controller/manuscriptController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/")
  .post(verifyJWT, manuscriptController.addManuscript)
  .get(verifyAdminJWT, manuscriptController.getAllManuscripts);
router.get("/getByUser", verifyJWT, manuscriptController.getUserManuscript);
router.get("/:id", manuscriptController.getManuscript);
router.get("/verify/:token", manuscriptController.getManuscriptByToken);
router
  .route("/:token")
  .patch(manuscriptController.editManuscript)
  .delete(manuscriptController.deleteManuscript);

router
  .route("/admin/:id")
  .delete(verifyAdminJWT, manuscriptController.deleteManuscriptByAdmin)
  .patch(verifyAdminJWT, manuscriptController.editManuscriptFile);

router.patch(
  "/:id/approve",
  verifyAdminJWT,
  manuscriptController.approveManuscript
);
router.patch(
  "/:id/remind",
  verifyAdminJWT,
  manuscriptController.sendReminderEmail
);
router.patch(
  "/:id/paid",
  verifyAdminJWT,
  verifyRoles("admin"),
  manuscriptController.handleManuscriptPaid
);
router.patch(
  "/:id/revoke",
  verifyAdminJWT,
  manuscriptController.revokeAcceptance
);
router.patch(
  "/:id/reject",
  verifyAdminJWT,
  manuscriptController.rejectManuscript
);
router.patch(
  "/:id/publish",
  verifyAdminJWT,
  manuscriptController.rejectManuscript
);

router.get(
  "/verify/:paymentReference",
  manuscriptController.getManuscriptByReference
);

module.exports = router;
