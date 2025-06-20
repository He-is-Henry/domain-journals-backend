const jwt = require("jsonwebtoken");
const verifyJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      console.log("No token");
      return res.sendStatus(401);
    }
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userData.id;
    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = verifyJWT;
