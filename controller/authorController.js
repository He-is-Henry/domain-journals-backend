const jwt = require("jsonwebtoken");
const Author = require("../model/Author");
const bcrypt = require("bcrypt");
const sendMail = require("../uttils/sendMail");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
};

// Helper function to issue token pair
const issueTokens = (res, authorId) => {
  const accessToken = jwt.sign({ userData: { id: authorId } }, JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userData: { id: authorId } },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" },
  );

  res.cookie("author_access", accessToken, {
    ...cookieBaseOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("author_refresh", refreshToken, {
    ...cookieBaseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return { accessToken, refreshToken };
};

const signup = async (req, res) => {
  try {
    const { name, email, password, matricNumber, department, level } = req.body;
    const authorExists = await Author.findOne({ email });
    if (authorExists)
      return res.status(403).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const author = await Author.create({
      name,
      email,
      password: hashed,
      matricNumber,
      department,
      level,
    });

    issueTokens(res, author._id);

    res.status(200).json({ author: { id: author._id, name: author.name } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const author = await Author.findOne({ email });
    if (!author) return res.status(400).json({ error: "User doesn't exist" });

    const match = await bcrypt.compare(password, author.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    issueTokens(res, author._id);

    res.status(200).json({ author });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.author_refresh;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const author = await Author.findById(decoded.userData.id);
    if (!author) {
      return res.status(401).json({ error: "Author no longer exists" });
    }

    // Issue a new 15-minute access token
    const accessToken = jwt.sign({ userData: { id: author._id } }, JWT_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("author_access", accessToken, {
      ...cookieBaseOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "Access token refreshed" });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

const updateAvatar = async (req, res) => {
  const { authorId, avatarUrl } = req.body;

  if (!authorId || !avatarUrl) {
    return res.status(400).json({ error: "Missing authorId or avatarUrl" });
  }
  if (req.userId !== authorId)
    return res.status(403).json({ error: "You're not allowed to do this" });

  try {
    const updated = await Author.findByIdAndUpdate(
      authorId,
      { profilePicture: avatarUrl },
      { new: true },
    ).select("name email profilePicture");

    if (!updated) {
      return res.status(404).json({ error: "Author not found" });
    }

    res.status(200).json({ message: "Avatar updated", author: updated });
  } catch (err) {
    console.error("Avatar update error:", err.stack);
    res.status(500).json({ error: "Could not update avatar" });
  }
};

const logout = (req, res) => {
  res
    .clearCookie("author_access", cookieBaseOptions)
    .clearCookie("author_refresh", cookieBaseOptions)
    .status(200)
    .json({ message: "Logged out" });
};

const handleResetMail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const author = await Author.findOne({ email });
    if (!author)
      return res.status(404).json({ error: "No user found with that email" });

    const resetKey = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 24 * 60 * 60 * 1000;

    // Fixed: Added await to bcrypt.hash
    author.resetKey = await bcrypt.hash(resetKey, 10);
    author.resetKeyExpires = expiry;
    author.resetKeyVerified = false;
    await author.save();

    const from = `"Domain Journals" <no-reply@domainjournals.com>`;

    await sendMail({
      from,
      to: email,
      subject: "Your Password Reset Code",
      text: `Your password reset code is: ${resetKey}. This code will expire in 24 hours.`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi there,</p>
      <p>You requested a password reset for your account on <strong>Domain Journals</strong>.</p>
      <p>Your reset code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #2c3e50; letter-spacing: 2px;">${resetKey}</span>
      </div>
      <p>This code is valid for <strong>24 hours</strong>. If you did not request this reset, you can safely ignore this message.</p>
      <p>Thanks,<br>The Domain Journals Team</p>
      <hr style="margin-top: 30px;" />
      <small style="color: #888;">This is an automated message, please do not reply.</small>
    </div>
  `,
    });

    res.status(200).json({
      message: "Reset code sent to email",
      userId: author._id,
    });
  } catch (err) {
    console.error("Reset mail error:", err.stack);
    res.status(500).json({ error: "Could not send reset mail" });
  }
};

const handleVerifyKey = async (req, res) => {
  const { id, resetKey } = req.body;

  if (!id || !resetKey) {
    return res
      .status(400)
      .json({ error: "User ID and reset key are required" });
  }

  try {
    const author = await Author.findById(id);
    if (!author || !author.resetKey || !author.resetKeyExpires) {
      return res
        .status(400)
        .json({ error: "Invalid or expired reset request" });
    }

    const now = Date.now();
    const match = await bcrypt.compare(resetKey, author.resetKey);

    if (!match) {
      return res.status(401).json({ error: "Invalid reset key" });
    }

    if (author.resetKeyExpires < now) {
      return res.status(410).json({ error: "Reset key has expired" });
    }

    author.resetKeyVerified = true;
    await author.save(); // Fixed: Added await

    res.status(200).json({ message: "Reset key verified" });
  } catch (err) {
    console.error("Verify key error:", err.stack);
    res.status(500).json({ error: "Failed to verify reset key" });
  }
};

const handleResetPassword = async (req, res) => {
  const { userId, resetKey, newPassword } = req.body;

  if (!userId || !resetKey || !newPassword)
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const author = await Author.findById(userId);
    if (!author) return res.status(404).json({ error: "Author not found" });

    if (
      !author.resetKey ||
      !author.resetKeyExpires ||
      Date.now() > author.resetKeyExpires
    ) {
      return res.status(403).json({ error: "Invalid or expired reset key" });
    }

    // Fixed: Properly compare plaintext resetKey against bcrypt hash
    const match = await bcrypt.compare(resetKey, author.resetKey);
    if (!match) {
      return res.status(403).json({ error: "Invalid reset key" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    author.password = hashed;

    author.resetKey = undefined;
    author.resetKeyExpires = undefined;
    author.resetKeyVerified = undefined;

    await author.save();

    res
      .clearCookie("author_access", cookieBaseOptions)
      .clearCookie("author_refresh", cookieBaseOptions)
      .status(200)
      .json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.stack);
    res.status(500).json({ error: "Could not reset password" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const author = await Author.findById(userId).select(
      "-password -resetKey -resetKeyExpires",
    );
    res.status(200).json(author);
  } catch (error) {
    console.error("getCurrentUser error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

const editDetails = async (req, res) => {
  try {
    const { name, level, department, matricNumber } = req.body;
    const id = req.userId;
    const author = await Author.findById(id);
    if (!author) return res.status(404).json({ error: "Author not found" });

    if (name) author.name = name;
    if (level) author.level = level;
    if (department) author.department = department;
    if (matricNumber) author.matricNumber = matricNumber;

    const result = await author.save();
    res.json(result);
  } catch (error) {
    console.error("editDetails error:", error);
    res.status(500).json({ error: "Could not update details" });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res
        .status(400)
        .json({ error: "Missing parameters, token or password" });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded) return res.status(400).json({ error: "Invalid token" });

    const hashed = await bcrypt.hash(password, 10);
    const id = decoded.id;

    const author = await Author.findById(id);
    if (!author || !author.adminReset)
      return res.status(400).json({ error: "Link already used or invalid" });

    author.password = hashed;
    author.adminReset = false;

    await author.save(); // Fixed: Added await
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("verifyResetToken error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
  refresh,
  getCurrentUser,
  updateAvatar,
  handleResetMail,
  handleVerifyKey,
  handleResetPassword,
  editDetails,
  verifyResetToken,
};
