const jwt = require("jsonwebtoken");
const verifyAdminJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.admin;
    if (!token) {
      console.log("No token");
      return res.sendStatus(401);
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userData.id;
    console.log(req.userId);
    req.role = decoded.userData.role;
    if (req.role === "editor") req.access = decoded.userData.access;
    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = verifyAdminJWT;
