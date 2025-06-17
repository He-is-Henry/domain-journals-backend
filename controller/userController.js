const jwt = require("jsonwebtoken");
const User = require("../model/User");
const sendMail = require("../uttils/sendMail");
const bcrypt = require("bcrypt");

const JWT_SECRET = process.env.JWT_SECRET;

const handleInvite = async (req, res) => {
  const { email, role } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  const userRole = role ? role : "editor";

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = await User.create({
      email,
      role: userRole,
      password: undefined,
    });

    const inviteToken = jwt.sign(
      { userData: { id: user._id, role: userRole } },
      JWT_SECRET,
      {
        expiresIn: "2d",
      }
    );

    const link = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;

    await sendMail({
      to: email,
      subject: "You're Invited",
      text: `You're invited to Domain Admin Panel. Click to join: ${link}`,
      html: `<p>You've been invited to join the Domain Admin Panel as <strong>${userRole}</strong>.</p>
             <p><a href="${link}">Click here to set up your account</a></p>
             <p>This link will expire in 2 days.</p>`,
    });

    res.status(200).json({ message: "Invitation sent", userId: user._id });
  } catch (err) {
    console.error("Invite error:", err.stack);
    res.status(500).json({ error: "Could not send invite" });
  }
};

const completeInvite = async (req, res) => {
  const { token } = req.params;
  const { name, password } = req.body;

  if (!token || !name || !password) {
    return res.status(400).json({ error: "Missing token, name or password" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded.userData);
    const userId = decoded.userData.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.password) {
      return res.status(400).json({ error: "Account already activated" });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: "Account setup complete" });
  } catch (err) {
    console.log("Invite acceptance failed:", err.stack);
    res.status(401).json({ error: "Invalid or expired invite link" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(401).json({ error: "User doesn'exist" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign(
      {
        userData: {
          id: user._id,
          role: user.role,
        },
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res
      .cookie("admin", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 2 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      });
  } catch (err) {
    console.error("Login error:", err.stack);
    res.status(500).json({ error: "Something went wrong" });
  }
};

const updateAvatar = async (req, res) => {
  const { userId, avatarUrl } = req.body;

  console.log(avatarUrl)

  if (!userId || !avatarUrl) {
    return res.status(400).json({ error: "Missing userId or avatarUrl" });
  }
  if (req.userId !== userId)
    return res.status(403).json({ error: "You're not allowed to do this" });

  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { profilePicture: avatarUrl },
      { new: true }
    ).select("name email profilePicture ");
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

const getCurrentUser = async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId).select("-password");
  res.status(200).json(user);
};

module.exports = {
  handleInvite,
  completeInvite,
  login,
  getCurrentUser,
  updateAvatar,
};
