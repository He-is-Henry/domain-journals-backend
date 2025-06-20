const express = require("express");
const router = express.Router();
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const journalController = require("../controller/journalController");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/:name")
  .get(journalController.getCurrentIssue)
  .patch(
    verifyAdminJWT,
    verifyRoles("admin"),
    journalController.changeCurrentIssue
  );

module.exports = router;
