const express = require("express");
const router = express.Router();
const messagecontroller = require("../controller/messageController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router
  .route("/")
  .post(messagecontroller.newMessage)
  .get(verifyAdminJWT, messagecontroller.getAllMessages);
router.post("/reply", verifyAdminJWT, messagecontroller.replyMessage);

module.exports = router;
