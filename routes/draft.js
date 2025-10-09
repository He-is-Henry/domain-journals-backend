const express = require("express");
const verifyAuthorJWT = require("../middleware/verifyJWT");
const router = express.Router();
const draftController = require("../controller/draftController");

router.post("/:examId", verifyAuthorJWT, draftController.saveDraft);
router.get("/:examId", verifyAuthorJWT, draftController.getDraft);
router.patch("/:examId", verifyAuthorJWT, draftController.markCompleted);

module.exports = router;
