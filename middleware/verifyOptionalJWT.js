const jwt = require("jsonwebtoken");
const Author = require("../model/Author");
const User = require("../model/User");

const verifyOptionalJWT = async (req, res, next) => {
  const adminToken = req.cookies?.admin_access;
  const authorToken = req.cookies?.author_access;

  if (!adminToken && !authorToken) {
    return next();
  }

  const candidates = [
    { token: adminToken, Model: User, defaultRole: undefined },
    { token: authorToken, Model: Author, defaultRole: "author" },
  ];

  for (const { token, Model, defaultRole } of candidates) {
    if (!token) continue;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded?.userData?.id;
      if (!userId) continue;

      const user = await Model.findById(userId).select("_id role");
      if (user) {
        req.userId = user._id;
        req.role = user.role || defaultRole;
        return next();
      }
    } catch (error) {
      if (
        error.name !== "JsonWebTokenError" &&
        error.name !== "TokenExpiredError"
      ) {
        console.error("Unexpected JWT verification error:", error);
      }
    }
  }

  return next();
};

module.exports = verifyOptionalJWT;
