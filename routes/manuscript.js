const express = require("express");
const router = express.Router();
const manuscriptController = require("../controller/manuscriptController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router
  .route("/")
  .post(manuscriptController.addManuscript)
  .get(verifyAdminJWT, manuscriptController.getAllManuscripts);

router
  .route("/:id")
  .get(manuscriptController.getManuscript)
  .patch(manuscriptController.editManuscript)
  .delete(manuscriptController.deleteManuscript);

module.exports = router;
