const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/")
  .post(verifyAdminJWT, verifyRoles("admin"), userController.handleInvite)
  .get(verifyAdminJWT, verifyRoles("admin"), userController.getAllUsers)
  .patch(verifyAdminJWT, userController.changeName);

router.post("/reset", userController.sendResetKey);
router.post("/verify", userController.verifyResetKey);
router.post("/resetPW", userController.handleResetPassword);
router
  .route("/userId")
  .get(verifyAdminJWT, verifyRoles("admin"), userController.getUser)
  .patch(verifyAdminJWT, verifyRoles("admin"), userController.changeRole);
router.patch("/complete/:token", userController.completeInvite);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
router.get("/me", verifyAdminJWT, userController.getCurrentUser);
router.patch("/avatar", verifyAdminJWT, userController.updateAvatar);

module.exports = router;
