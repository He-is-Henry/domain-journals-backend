const express = require("express");
const router = express.Router();
const acceptedManuscriptController = require("../controller/acceptedManuscriptsController");

router.get("/:name/:issue", acceptedManuscriptController.getByIssue);
router.route("/:name").get(acceptedManuscriptController.getArchive);

module.exports = router;
