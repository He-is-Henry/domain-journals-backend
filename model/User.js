const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },
    profilePicture: String,
    password: {
      type: String,
      default: undefined,
    },

    profilePicture: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "editor"],
      default: "editor",
    },

    resetKey: {
      type: String,
    },

    resetKeyExpires: {
      type: Date,
    },
    access: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
