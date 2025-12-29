const jwt = require("jsonwebtoken");
const User = require("../model/User");
const sendMail = require("../uttils/sendMail");
const bcrypt = require("bcrypt");
const Author = require("../model/Author");

const JWT_SECRET = process.env.JWT_SECRET;

const handleInvite = async (req, res) => {
  const { email, role, access } = req.body;
  const allowedAccesses = [
    "domain-health-journal",
    "domain-journal-of-science-and-technology",
    "domain-multidisciplinary-journal",
    "domain-journal-of-biological-sciences",
  ];
  if (role === "editor" && !allowedAccesses.find((a) => a === access))
    return res.status(401).json({ error: "Invalid Access" });
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  const userRole = role ? role : "editor";
  if (userRole === "editor" && !access) {
    return res
      .status(400)
      .json({ error: "Access specification required for editors" });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = await User.create({
      email,
      role: userRole,
      access,
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
          access: user.access,
        },
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res
      .cookie("admin", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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

  console.log(avatarUrl);

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
      return res.status(404).json({ error: "user not found" });
    }

    res.status(200).json({ message: "Avatar updated", user: updated });
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

const getAllUsers = async (req, res) => {
  const allUsers = await User.find().select("-password");
  res.json(allUsers);
};

const getUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("-password");
  res.status(200).json(user);
};

const changeName = async (req, res) => {
  const { name } = req.body;
  const user = req.name;
  user.name = name;
  console.log(user);
  const result = await user.save();
  res.json(result);
};
const changeRole = async (req, res) => {
  const foundingMembers = [
    "eseovo2000@yahoo.com",
    "ejumediaonelson@gmail.com",
    "henries90@gmail.com",
  ];
  const { userId } = req.params;
  const { role, access } = req.body;
  const acceptedRoles = ["editor", "admin"];
  if (!acceptedRoles.includes(role))
    return res.status(409).json({ error: "invalid user role" });
  const user = await User.findById(userId);

  if (foundingMembers.includes(user.email))
    return res
      .status(401)
      .json({ error: "You cannot perform this action on a founding member" });
  if (role === "editor" && !access)
    return res.status(400).json({ error: "Editors need an access field" });
  if (user.role === role && user.access === access)
    return res.status(409).json({
      error: `User is already an ${role} ${
        role === "editor" ? `of ${access}` : ""
      }`,
    });
  const oldRole = user.role;
  const oldAccess = user.access;

  user.role = role;
  if (role === "editor") user.access = access;
  else user.access = undefined;
  const result = await user.save();

  const from = `"${req.name} from Domain Journals" <no-reply@domainjournals.com>`;
  const to = user.email;
  const subject = "Your role has been updated";

  let html = `
  <p>Hello ${user.name || user.email},</p>
  <p>Your role in the Domain Journals system has been updated by <strong>${
    req.name
  }</strong>.</p>
  <p><strong>Previous Role:</strong> ${oldRole}${
    oldRole === "editor" ? ` (Access: ${oldAccess})` : ""
  }</p>
  <p><strong>New Role:</strong> ${result.role}${
    role === "editor" ? ` (New Access: ${result.access})` : ""
  }</p>
  <p>If you have any questions or believe this was a mistake, please contact the admin team.</p>
  <p>Thank you.</p>
`;

  await sendMail({ from, to, subject, html });
  res.json(result);
};

const deleteUser = async (req, res) => {
  const foundingMembers = [
    "eseovo2000@yahoo.com",
    "ejumediaonelson@gmail.com",
    "henries90@gmail.com",
  ];
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User doesn't exist" });
  if (foundingMembers.includes(user.email))
    return res
      .status(401)
      .json({ error: "You cannot perform this action on a founding member" });
  const result = await user.deleteOne();
  res.json(result);
};
const sendResetKey = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ error: "No user found with that email" });

    const resetKey = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 24 * 60 * 60 * 1000;

    user.resetKey = resetKey;
    user.resetKeyExpires = expiry;
    await user.save();
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
      userId: user._id,
    });
  } catch (err) {
    console.error("Reset mail error:", err.stack);
    res.status(500).json({ error: "Could not send reset mail" });
  }
};
const verifyResetKey = async (req, res) => {
  const { id, resetKey } = req.body;

  if (!id || !resetKey) {
    return res
      .status(400)
      .json({ error: "User ID and reset key are required" });
  }

  try {
    const user = await User.findById(id);
    if (!user || !user.resetKey || !user.resetKeyExpires) {
      return res
        .status(400)
        .json({ error: "Invalid or expired reset request" });
    }

    const now = Date.now();

    if (user.resetKey !== resetKey) {
      return res.status(401).json({ error: "Invalid reset key" });
    }

    if (user.resetKeyExpires < now) {
      return res.status(410).json({ error: "Reset key has expired" });
    }
    user.resetKeyVerified = true;
    await user.save();

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
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "user not found" });

    if (
      !user.resetKey ||
      user.resetKey !== resetKey ||
      Date.now() > user.resetKeyExpires
    ) {
      return res.status(403).json({ error: "Invalid or expired reset key" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    user.resetKey = undefined;
    user.resetKeyExpires = undefined;

    await user.save();
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
const logout = (req, res) => {
  res
    .clearCookie("admin", {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 1000,
      scure: false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    })
    .status(204)
    .json({ message: "Logged out" });
};

const resetAuthorPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const author = Author.find({ email });
    const name = author.name;
    if (!author)
      return res
        .status(400)
        .json({ error: "Author with that email doesn't exist" });

    const token = jwt.sign(
      {
        id: author._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    author.adminReset = true;
    author.save();
    res.json({ token, name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
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
  logout,
  sendResetKey,
  verifyResetKey,
  handleResetPassword,
  handleInvite,
  getUser,
  completeInvite,
  login,
  changeRole,
  deleteUser,
  getCurrentUser,
  updateAvatar,
  getAllUsers,
  changeName,
  resetAuthorPassword,
  verifyResetToken,
};
