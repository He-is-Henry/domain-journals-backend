const express = require("express");
const path = require("path");

const filePath = path.resolve(__dirname, "view", "404.html");
const indexPath = path.resolve(__dirname, "view", "index.html");

const app = express.Router();

app.get("/", (req, res) => {
  return res.sendFile(indexPath);
});

app.get("/wake", (req, res) => {
  return res.json({
    status: "Awake",
    time: new Date(),
  });
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
app.use("/archives", require("./routes/archive"));
app.use("/supabase", require("./routes/supabase"));
app.get("/*splat", (req, res) => {
  res.sendFile(filePath);
});

module.exports = app;
