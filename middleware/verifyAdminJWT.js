const jwt = require("jsonwebtoken");
const User = require("../model/User");

const verifyAdminJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.admin_access;

    if (!token) {
      return res.status(401).json({
        error: "Access token missing",
        code: "ADMIN_TOKEN_EXPIRED",
      });
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
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access token expired",
        code: "ADMIN_TOKEN_EXPIRED",
      });
    }
    console.error("JWT ADMIN VERIFICATION ERROR:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyAdminJWT;
