const { Review } = require("../model/Review");

const addReview = async (req, res) => {
  const review = req.body;
  if (!review) return res.status(400).json({ error: "Review not found" });
  review.authorId = req.UserId;
  const result = await Review.create(review);
  res.json(result);
};

module.exports = { addReview };
