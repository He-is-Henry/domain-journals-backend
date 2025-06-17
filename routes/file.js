const express = require("express");
const router = express.Router();
const { upload, uploadImage } = require("../uploads");
const fileController = require("../controller/fileController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router.post("/", upload.single("file"), fileController.uploadFile);
router.post(
  "/avatar",
  verifyJWT,
  uploadImage.single("avatar"),
  fileController.uploadAvatar
);
router.post(
  "/adminAvatar",
  verifyAdminJWT,
  uploadImage.single("avatar"),
  fileController.uploadAvatar
);

module.exports = router;
