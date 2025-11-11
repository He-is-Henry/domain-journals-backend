const express = require("express");
const verifyRoles = require("../middleware/verifyRoles");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const archiveController = require("../controller/archiveController");
const router = express.Router();

router
  .route("/")
  .post(verifyAdminJWT, verifyRoles("admin"), archiveController.addNewArchive)
  .get(archiveController.getAllArchives);

module.exports = router;
