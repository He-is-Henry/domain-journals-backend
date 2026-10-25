const express = require("express");
const router = express.Router();
const {
  upload,
  uploadImage,
  uploadReceipt,
  uploadFigure,
} = require("../uploads");
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
  fileController.uploadImage,
);

router.post(
  "/receipt",
  verifyJWT,
  uploadReceipt.single("receipt"),
  fileController.uploadImage,
);

router.post(
  "/figure",
  verifyAdminJWT,
  uploadFigure.single("figure"),
  fileController.uploadImage,
);

router.post(
  "/adminAvatar",
  verifyAdminJWT,
  uploadImage.single("avatar"),
  fileController.uploadImage,
);

module.exports = router;
