const express = require("express");
const router = express.Router();
const upload = require("../uploads");
const fileController = require("../controller/fileController");

router.post("/", upload.single("file"), fileController.uploadFile);

module.exports = router;
