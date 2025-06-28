const express = require("express");
const router = express.Router();
const newsletterController = require("../controller/newsletterController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyRoles = require("../middleware/verifyRoles");

router.post("/subscribe", newsletterController.subscribe);
router.post(
  "/send",
  verifyAdminJWT,
  verifyRoles("admin"),
  newsletterController.sendNewsletter
);

module.exports = router;
