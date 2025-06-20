const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const reviewController = require("../controller/reviewController");

router.post("/", verifyJWT, reviewController.addReview);

module.exports = router;
