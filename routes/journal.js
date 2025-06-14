const express = require("express");
const router = express.Router();
const journalController = require("../controller/journalController");

router
  .route("/:name")
  .get(journalController.getCurrentIssue)
  .patch(journalController.changeCurrentIssue);

module.exports = router;
