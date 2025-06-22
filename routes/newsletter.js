const express = require("express");
const router = express.Router();
const newsletterController = require("../controller/newsletterController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router.post("/subscribe", newsletterController.subscribe);
router.post("/send", verifyAdminJWT, newsletterController.sendNewsletter);

module.exports = router;
