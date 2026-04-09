const express = require("express");
const router = express.Router();
const { uploadToMemory } = require("../uploads");
const { uploadPdf, deletePdf } = require("../controller/supabaseController");

router.post("/upload", uploadToMemory.single("file"), uploadPdf);
router.delete("/delete", deletePdf);

module.exports = router;
