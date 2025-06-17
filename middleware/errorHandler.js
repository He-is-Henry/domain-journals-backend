const { logger } = require("./logger");
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
  logger(`${req.method}\t${req.url}\t`, "errLog.logs");
  console.log(err.message);
};

module.exports = errorHandler;
