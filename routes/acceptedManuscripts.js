const express = require("express");
const router = express.Router();
const acceptedManuscriptController = require("../controller/acceptedManuscriptsController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router.post(
  "/",
  verifyAdminJWT,
  acceptedManuscriptController.publishManuscript
);
router.get("/:name/:issue", acceptedManuscriptController.getByIssue);
router.route("/:name").get(acceptedManuscriptController.getArchive);

module.exports = router;
