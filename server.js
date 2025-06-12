require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const { logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const PORT = process.env.PORT || 3500;
const path = require("path");
const corsOptions = require("./config/corsOptions");
const filePath = path.resolve(__dirname, "view", "index.html");

connectDB();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

app.use(logEvents);

app.get("/", (req, res) => {
  return res.send("Hello");
});

app.use("/file", require("./routes/file"));
app.use("/manuscript", require("./routes/manuscript"));

app.all("/*splat", (req, res) => {
  return res.sendFile(filePath);
});
app.use(errorHandler);

mongoose.connection.once("connected", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log("Server running on port", PORT));
});
