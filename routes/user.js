const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/")
  .post(verifyAdminJWT, verifyRoles("admin"), userController.handleInvite)
  .get(verifyAdminJWT, userController.getAllUsers)
  .patch(verifyAdminJWT, userController.changeName);

router.post("/reset", userController.sendResetKey);
router.post("/verify", userController.verifyResetKey);
router.post("/resetAuthor", userController.resetAuthorPassword);
router.post("/verifyAuthor", userController.verifyResetToken);
router.post("/resetPW", userController.handleResetPassword);
router.get("/me", verifyAdminJWT, userController.getCurrentUser);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
router.patch("/avatar", verifyAdminJWT, userController.updateAvatar);
router
  .route("/:userId")
  .get(verifyAdminJWT, verifyRoles("admin"), userController.getUser)
  .patch(verifyAdminJWT, verifyRoles("admin"), userController.changeRole)
  .delete(verifyAdminJWT, verifyRoles("admin"), userController.deleteUser);
router.patch("/complete/:token", userController.completeInvite);

module.exports = router;
