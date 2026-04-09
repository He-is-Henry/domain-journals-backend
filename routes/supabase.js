const express = require("express");
const router = express.Router();
const { uploadToMemory } = require("../uploads");
const {
  uploadPdf,
  deletePdf,
  getPdfUrl,
} = require("../controller/supabaseController");

router.post("/upload", uploadToMemory.single("file"), uploadPdf);
router.delete("/delete", deletePdf);
router.post("/url", getPdfUrl);

module.exports = router;
