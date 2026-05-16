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

connectDB();
app.use("/pay/webhook", express.raw({ type: "application/json" }));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

app.use(logEvents);

app.use("/", require("./routes"));

app.use(errorHandler);

mongoose.connection.once("connected", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
    console.log(process.env.NODE_ENV);
  });
});
