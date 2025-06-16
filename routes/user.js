const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyRoles = require("../middleware/verifyRoles");

router.post("/", verifyRoles("admin"), userController.handleInvite);
router.patch("/complete/:token", userController.completeInvite);
router.post("/login", userController.login);
router.get("/me", verifyAdminJWT, userController.getCurrentUser);

module.exports = router;

module.exports = router;
