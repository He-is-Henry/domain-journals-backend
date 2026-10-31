const jwt = require("jsonwebtoken");
const User = require("../model/User");
const Author = require("../model/Author");
const sendMail = require("../uttils/sendMail");
const bcrypt = require("bcrypt");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
};

const issueAdminTokens = (res, user) => {
  const accessToken = jwt.sign(
    {
      userData: {
        id: user._id,
        role: user.role,
        access: user.access,
      },
    },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { userData: { id: user._id } },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" },
  );

  res.cookie("admin_access", accessToken, {
    ...cookieBaseOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("admin_refresh", refreshToken, {
    ...cookieBaseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(401).json({ error: "User doesn't exist" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    issueAdminTokens(res, user);

    res.json({
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

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.admin_refresh;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userData.id);
    if (!user) {
      return res.status(401).json({ error: "Admin/Editor no longer exists" });
    }

    const accessToken = jwt.sign(
      {
        userData: {
          id: user._id,
          role: user.role,
          access: user.access,
        },
      },
      JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("admin_access", accessToken, {
      ...cookieBaseOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "Admin access token refreshed" });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

const logout = (req, res) => {
  res
    .clearCookie("admin_access", cookieBaseOptions)
    .clearCookie("admin_refresh", cookieBaseOptions)
    .status(200)
    .json({ message: "Logged out" });
};

const handleInvite = async (req, res) => {
  const { email, role, access } = req.body;
  const allowedAccesses = [
    "domain-health-journal",
    "domain-journal-of-science-and-technology",
    "domain-multidisciplinary-journal",
    "domain-journal-of-biological-sciences",
  ];

  if (role === "editor" && !allowedAccesses.includes(access))
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
      { expiresIn: "2d" },
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
    const decoded = jwt.verify(token, JWT_SECRET);
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
    console.error("Invite acceptance failed:", err.stack);
    res.status(401).json({ error: "Invalid or expired invite link" });
  }
};

const updateAvatar = async (req, res) => {
  const { userId, avatarUrl } = req.body;

  if (!userId || !avatarUrl) {
    return res.status(400).json({ error: "Missing userId or avatarUrl" });
  }
  if (req.userId !== userId)
    return res.status(403).json({ error: "You're not allowed to do this" });

  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { profilePicture: avatarUrl },
      { new: true },
    ).select("name email profilePicture");

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Avatar updated", user: updated });
  } catch (err) {
    console.error("Avatar update error:", err.stack);
    res.status(500).json({ error: "Could not update avatar" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select(
      "-password -resetKey -resetKeyExpires",
    );
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find().select("-password");
    res.json(allUsers);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password");
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "User not found" });
  }
};

const changeName = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.name = name;
    const result = await user.save();
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Could not update name" });
  }
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
    return res.status(409).json({ error: "Invalid user role" });

  try {
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
    <p>If you have any questions, please contact the admin team.</p>
  `;

    await sendMail({ from, to, subject, html });
    res.json(result);
  } catch (err) {
    console.log(err);

    res.status(500).json({ error: "Failed to update role" });
  }
};

const deleteUser = async (req, res) => {
  const foundingMembers = [
    "eseovo2000@yahoo.com",
    "ejumediaonelson@gmail.com",
    "henries90@gmail.com",
  ];
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User doesn't exist" });
    if (foundingMembers.includes(user.email))
      return res
        .status(401)
        .json({ error: "You cannot perform this action on a founding member" });

    const result = await user.deleteOne();
    res.json(result);
  } catch (err) {
    console.log(err);

    res.status(500).json({ error: "Could not delete user" });
  }
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

    // Fixed: Added await to bcrypt.hash
    user.resetKey = await bcrypt.hash(resetKey, 10);
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
        <p>Your reset code is:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #2c3e50; letter-spacing: 2px;">${resetKey}</span>
        </div>
        <p>This code is valid for <strong>24 hours</strong>.</p>
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
    const match = await bcrypt.compare(resetKey, user.resetKey);

    if (!match) {
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
    return res.status(400).json({ error: "Missing required fields" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (
      !user.resetKey ||
      !user.resetKeyExpires ||
      Date.now() > user.resetKeyExpires
    ) {
      return res.status(403).json({ error: "Invalid or expired reset key" });
    }

    const match = await bcrypt.compare(resetKey, user.resetKey);
    if (!match) {
      return res.status(403).json({ error: "Invalid reset key" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetKey = undefined;
    user.resetKeyExpires = undefined;

    await user.save();

    res
      .clearCookie("admin_access", cookieBaseOptions)
      .clearCookie("admin_refresh", cookieBaseOptions)
      .status(200)
      .json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.stack);
    res.status(500).json({ error: "Could not reset password" });
  }
};

const resetAuthorPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const author = await Author.findOne({ email });
    if (!author)
      return res
        .status(400)
        .json({ error: "Author with that email doesn't exist" });

    const token = jwt.sign({ id: author._id }, JWT_SECRET, { expiresIn: "1h" });

    author.adminReset = true;
    await author.save();

    res.json({ token, name: author.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  handleInvite,
  completeInvite,
  getUser,
  getAllUsers,
  changeName,
  changeRole,
  deleteUser,
  getCurrentUser,
  updateAvatar,
  sendResetKey,
  verifyResetKey,
  handleResetPassword,
  resetAuthorPassword,
};
