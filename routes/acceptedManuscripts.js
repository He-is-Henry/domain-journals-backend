const express = require("express");
const router = express.Router();
const acceptedManuscriptController = require("../controller/acceptedManuscriptsController");

router.route("/:name/:issue").get(acceptedManuscriptController.getByIssue);

module.exports = router;
