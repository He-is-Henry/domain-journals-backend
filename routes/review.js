const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const reviewController = require("../controller/reviewController");
const verifyAdminJWT = require("../middleware/verifyAdminJWT");

router
  .route("/")
  .post(verifyJWT, reviewController.addReview)
  .get(reviewController.getAllReviews);

router.get("/audit", verifyAdminJWT, reviewController.auditReviews);
router
  .route("/:id")
  .patch(verifyAdminJWT, reviewController.verifyReview)
  .delete(verifyAdminJWT, reviewController.deleteReview);

module.exports = router;
