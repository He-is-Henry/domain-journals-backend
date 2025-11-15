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
  department: {
    type: String,
    default: null,
    enum: [
      "anatomy",
      "pharmacy",
      "medical laboratory science",
      "nursing",
      "medical biochemistry",
      "physiology",
      "pharmacology",
      "medicine and surgery",
      "dentistry",
    ],
  },
  level: {
    type: Number,
    enum: [100, 200, 300, 400, 500, 600, 700, 800],
  },
  matricNumber: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Author", authorSchema);
