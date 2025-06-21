const Author = require("../model/Author");
const { Review } = require("../model/Review");

const addReview = async (req, res) => {
  const review = req.body;
  if (!review) return res.status(400).json({ error: "Review not found" });
  review.authorId = req.userId;
  const result = await Review.create(review);
  res.json(result);
};

const getAllReviews = async (req, res) => {
  const reviews = await Review.find();
  const reviewDetails = await Promise.all(
    reviews.map(async (review) => {
      const author = await Author.findById(review.authorId).select(
        "name profilePicture"
      );
      const name = author.name;
      const profilePicture = author.profilePicture;
      return { ...review.toObject(), name, profilePicture };
    })
  );
  res.json(reviewDetails);
};

module.exports = { addReview, getAllReviews };
