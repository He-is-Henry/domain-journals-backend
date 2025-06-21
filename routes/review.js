const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const reviewController = require("../controller/reviewController");

router
  .route("/")
  .post(verifyJWT, reviewController.addReview)
  .get(reviewController.getAllReviews);

module.exports = router;
