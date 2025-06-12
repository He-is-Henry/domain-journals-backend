const express = require("express");
const router = express.Router();
const manuscriptController = require("../controller/manuscriptController");

router.post("/", manuscriptController.addManuscript);

module.exports = router;
