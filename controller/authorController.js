const jwt = require("jsonwebtoken");
const Author = require("../model/Author");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
const sendMail = require("../uttils/sendMail");

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
    const token = await jwt.sign({ userData: { id: author._id } }, JWT_SECRET, {
      expiresIn: "365d",
    });
    res.cookie("author", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 1000,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });
    res.status(200).json({ author: { id: author._id, name: author.name } });
  } catch (error) {
    console.log(error);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const author = await Author.findOne({ email });
  if (!author) return res.status(400).json({ error: "User doesn't exist" });

  const match = await bcrypt.compare(password, author.password);
  if (!match) return res.status(400).json({ error: "Incorrect password" });

  const token = await jwt.sign({ userData: { id: author._id } }, JWT_SECRET, {
    expiresIn: "365d",
  });
  res.cookie("author", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365 * 1000,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  });
  res.status(200).json({ author });
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
      { new: true }
    ).select("name email profilePicture");
    console.log(updated);

    if (!updated) {
      return res.status(404).json({ error: "Author not found" });
    }

    res.status(200).json({ message: "Avatar updated", author: updated });
  } catch (err) {
    console.log("Avatar update error:", err.stack);
    res.status(500).json({ error: "Could not update avatar" });
  }
};

const logout = (req, res) => {
  res
    .clearCookie("author", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 1000,
      scure: false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    })
    .status(204)
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

    author.resetKey = resetKey;
    author.resetKeyExpires = expiry;
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

    if (author.resetKey !== resetKey) {
      return res.status(401).json({ error: "Invalid reset key" });
    }

    if (author.resetKeyExpires < now) {
      return res.status(410).json({ error: "Reset key has expired" });
    }
    author.resetKeyVerified = true;
    author.save();

    res.status(200).json({ message: "Reset key verified" });
  } catch (err) {
    console.error("Verify key error:", err.stack);
    res.status(500).json({ error: "Failed to verify reset key" });
  }
};

const handleResetPassword = async (req, res) => {
  const { userId, resetKey, newPassword } = req.body;

  if (!userId || !resetKey || !newPassword)
    return res.status(400).json({ error: "Missing required field (id)" });

  try {
    const author = await Author.findById(userId);
    if (!author) return res.status(404).json({ error: "Author not found" });

    if (
      !author.resetKey ||
      author.resetKey !== resetKey ||
      Date.now() > author.resetKeyExpires
    ) {
      return res.status(403).json({ error: "Invalid or expired reset key" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    author.password = hashed;

    author.resetKey = undefined;
    author.resetKeyExpires = undefined;

    await author.save();
    res
      .clearCookie("author", {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365 * 1000,
        scure: false,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      })
      .status(200)
      .json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.stack);
    res.status(500).json({ error: "Could not reset password" });
  }
};

const getCurrentUser = async (req, res) => {
  const userId = req.userId;
  const author = await Author.findById(userId).select("-password");
  res.status(200).json(author);
};

const editDetails = async (req, res) => {
  try {
    const { name, level, department, matricNumber } = req.body;
    const id = req.userId;
    const author = await Author.findById(id);
    if (name) author.name = name;
    if (level) author.level = level;
    if (department) author.department = department;
    if (matricNumber) author.matricNumber = matricNumber;
    const result = await author.save();
    res.json(result);
  } catch (error) {
    console.log(error);
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return res.status(400).json({ error: "Invalid token" });
    const hashed = bcrypt.hash(password);

    const id = decoded.id;

    const author = await Author.findById(id);
    if (!author.adminReset)
      return res.status(400).json({ error: "Link already used" });
    author.password = hashed;
    author.adminReset = false;

    author.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};
module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  updateAvatar,
  handleResetMail,
  handleVerifyKey,
  handleResetPassword,
  editDetails,
  verifyResetToken,
};
