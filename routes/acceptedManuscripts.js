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
    acceptedManuscriptsController.publishManuscript,
  )
  .get(verifyJWT, acceptedManuscriptsController.getUserManuscript);

router.post(
  "/admin",
  verifyAdminJWT,
  verifyRoles("admin"),
  acceptedManuscriptsController.adminUploadManuscript,
);

router.get("/all/", acceptedManuscriptsController.getAllAcceptedManuscripts);
router.get("/recent/", acceptedManuscriptsController.getRecentManuscripts);
router.get("/new/:journal", acceptedManuscriptsController.getPublishPreview);

router.get("/view/:id", acceptedManuscriptsController.getManuscript);
router.get("/slug/:slug", acceptedManuscriptsController.getBySlug);
router.get("/:name/:issue", acceptedManuscriptsController.getByIssue);

// Edit & Delete accepted manuscript routes
router
  .route("/:id")
  .patch(
    verifyAdminJWT,
    verifyRoles("admin"),
    acceptedManuscriptsController.updateAcceptedManuscript,
  )
  .delete(
    verifyAdminJWT,
    verifyRoles("admin"),
    acceptedManuscriptsController.deleteAcceptedManuscript,
  );

router.get("/:name", acceptedManuscriptsController.getArchive);

module.exports = router;
