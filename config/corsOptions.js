const allowList = require("./allowList");

const corsOptions = {
  origin: (origin, callback) => {
    console.log("Request Origin:", origin);
    if (allowList.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by cors"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

module.exports = corsOptions;
