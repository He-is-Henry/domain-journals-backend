const jwt = require("jsonwebtoken");
const User = require("../model/User");

const verifyAdminJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.admin;

    if (!token) {
      return res.status(401).json({ error: "Token not found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userData.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.userId = user._id;
    req.name = user.name;
    req.role = user.role;
    if (user.role === "editor") req.access = user.access;

    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyAdminJWT;
