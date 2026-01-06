const express = require("express");
const router = express.Router();
const { upload, uploadImage, uploadReceipt } = require("../uploads");
const fileController = require("../controller/fileController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router
  .route("/")
  .post(upload.single("file"), fileController.uploadFile)
  .get(fileController.downloadFile);

router.post(
  "/avatar",
  verifyJWT,
  uploadImage.single("avatar"),
  fileController.uploadAvatar
);
router.post(
  "/receipt",
  verifyJWT,
  uploadReceipt.single("receipt"),
  fileController.uploadAvatar
);
router.post(
  "/adminAvatar",
  verifyAdminJWT,
  uploadImage.single("avatar"),
  fileController.uploadAvatar
);

module.exports = router;
