const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  read: { type: Boolean, default: false },
  message: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
});

module.exports.Message = mongoose.model("Message", messageSchema);
