const jwt = require("jsonwebtoken");
const Author = require("../model/Author");

const verifyAuthorJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.author;

    if (!token) {
      return res.status(401).json({ error: "Token not found" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userData.id;

    const author = await Author.findById(userId);

    if (!author) {
      return res.status(401).json({ error: "Author no longer exists" });
    }

    req.userId = author._id;
    req.role = author.role;

    next();
  } catch (error) {
    console.log("JWT verification error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyAuthorJWT;
