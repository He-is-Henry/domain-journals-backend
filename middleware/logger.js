const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");

const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = (message, logFileName = "events.log") => {
  const filePath = path.join(logsDir, logFileName);
  const timeStamp = new Date().toISOString();
  const logItem = `${uuid()}\t[${timeStamp}]\t${message}\n`;

  fs.appendFile(filePath, logItem, (err) => {
    if (err) console.error("Failed to write log:", err);
  });
};

const logEvents = (req, res, next) => {
  logger(`${req.method}\t${req.url}\t${req.origin}`);
  next();
};

module.exports = { logger, logEvents };
