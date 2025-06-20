const express = require("express");
const router = express.Router();
const acceptedManuscriptController = require("../controller/acceptedManuscriptsController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");

router
  .route("/")
  .post(verifyAdminJWT, acceptedManuscriptController.publishManuscript)
  .get(verifyJWT, acceptedManuscriptController.getUserManuscript);
router.get("/:name/:issue", acceptedManuscriptController.getByIssue);
router.route("/:name").get(acceptedManuscriptController.getArchive);

module.exports = router;
