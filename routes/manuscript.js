const express = require("express");
const router = express.Router();
const manuscriptController = require("../controller/manuscriptController");

router.post("/", manuscriptController.addManuscript);

router
  .route("/:id")
  .get(manuscriptController.getManuscript)
  .patch(manuscriptController.editManuscript)
  .delete(manuscriptController.deleteManuscript);

module.exports = router;
