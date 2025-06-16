const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: String,
  provider: {
    type: String,
    enum: ["email", "google"],
    default: "email",
  },
  createdAt: { type: Date, default: Date.now },
  profilePicture: {
    type: String,
  },
  resetKey: {
    type: String,
  },
  resetKeyExpires: {
    type: Date,
  },
});

module.exports = mongoose.model("Author", authorSchema);
