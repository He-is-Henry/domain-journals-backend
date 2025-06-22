const Author = require("../model/Author");
const { Review } = require("../model/Review");

const addReview = async (req, res) => {
  const review = req.body;
  if (review.text.length > 300)
    return res.status(500).json({ error: "Char limit exceeded" });
  if (!review) return res.status(400).json({ error: "Review not found" });
  review.authorId = req.userId;
  const result = await Review.create(review);
  res.json(result);
};

const getAllReviews = async (req, res) => {
  const reviews = await Review.find({ verified: true });
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
const auditReviews = async (req, res) => {
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

const verifyReview = async (req, res) => {
  const { id } = req.params;
  const review = await Review.findById(id);
  review.verified = true;
  const result = await review.save();
  res.json(result);
};

const deleteReview = async (req, res) => {
  const { id } = req.params;
  const result = await Review.findByIdAndDelete(id);
  res.json(result);
};
module.exports = {
  addReview,
  auditReviews,
  getAllReviews,
  verifyReview,
  deleteReview,
};
