const express = require("express");
const router = express.Router();
const authorController = require("../controller/authorController");
const verifyJWT = require("../middleware/verifyJWT");

router.post("/signup", authorController.signup);
router.post("/login", authorController.login);
router.post("/logout", authorController.logout);
router.post("/reset", authorController.handleResetMail);
router.post("/verify", authorController.handleVerifyKey);
router.post("/resetPw", authorController.handleResetPassword);
router.get("/me", verifyJWT, authorController.getCurrentUser);
router.patch("/avatar", verifyJWT, authorController.updateAvatar);

module.exports = router;
