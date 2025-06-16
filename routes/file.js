const express = require("express");
const router = express.Router();
const { upload, uploadImage } = require("../uploads");
const fileController = require("../controller/fileController");
const { updateAvatar } = require("../controller/authorController");
const verifyJWT = require("../middleware/verifyJWT");

router.post("/", upload.single("file"), fileController.uploadFile);
router.post(
  "/avatar",
  verifyJWT,
  uploadImage.single("avatar"),
  fileController.uploadAvatar
);

module.exports = router;
