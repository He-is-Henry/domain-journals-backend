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
const filePath = path.resolve(__dirname, "view", "404.html");
const indexPath = path.resolve(__dirname, "view", "index.html");

connectDB();
app.use("/pay/webhook", express.raw({ type: "application/json" }));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

app.use(logEvents);

app.get("/", (req, res) => {
  return res.sendFile(indexPath);
});

app.use("/file", require("./routes/file"));
app.use("/manuscript", require("./routes/manuscript"));
app.use("/journal", require("./routes/journal"));
app.use("/accepted", require("./routes/acceptedManuscripts"));
app.use("/author", require("./routes/author"));
app.use("/admin", require("./routes/user"));
app.use("/pay", require("./routes/payment"));
app.use("/review", require("./routes/review"));
app.use("/message", require("./routes/message"));
app.use("/course", require("./routes/course"));
app.use("/newsletter", require("./routes/newsletter"));
app.use("/exam", require("./routes/exam"));
app.use("/result", require("./routes/result"));
app.use("/draft", require("./routes/draft"));
app.get("/*splat", (req, res) => {
  res.sendFile(filePath);
});

app.use(errorHandler);

mongoose.connection.once("connected", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
    console.log(process.env.NODE_ENV);
  });
});
