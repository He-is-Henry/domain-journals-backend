const express = require("express");
const router = express.Router();
const acceptedManuscriptsController = require("../controller/acceptedManuscriptsController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyJWT = require("../middleware/verifyJWT");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/")
  .post(
    verifyAdminJWT,
    verifyRoles("admin"),
    acceptedManuscriptsController.publishManuscript
  )
  .get(verifyJWT, acceptedManuscriptsController.getUserManuscript);
router.get("/recent/", acceptedManuscriptsController.getRecentManuscripts);
router.get("/new/:journal", acceptedManuscriptsController.getPublishPreview);
router.get("/view/:id", acceptedManuscriptsController.getManuscript);
router.get("/:name/:issue", acceptedManuscriptsController.getByIssue);

router.route("/:name").get(acceptedManuscriptsController.getArchive);

module.exports = router;
