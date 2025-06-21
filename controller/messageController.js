const { Message } = require("../model/Message");
const sendMail = require("../uttils/sendMail");

const newMessage = async (req, res) => {
  const { firstName, lastName, email, message } = req.body;
  try {
    const messageObject = await Message.create({
      firstName,
      lastName,
      email,
      message,
    });
    res.json({
      messageObject,
      success: "Message succesfully sent, we'll reply via email",
    });
  } catch (error) {}
};

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong", err: error });
  }
};

const replyMessage = async (req, res) => {
  console.log("replying");
  const { name, reply, messageId } = req.body;
  try {
    const message = await Message.findById(messageId);
    console.log(message);
    await sendMail({
      to: message.email,
      subject: `Reply to your message ${message.message}`,
      text: `${String(reply).substring(0, 40)}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #333;">Reply to you message</h2>
        <p>Dear ${name}</p>
        <p>A reply to your message to <strong>Domain Journals</strong>.</p>
       <p> ${reply} </p>
       
      
      </div>
    `,
    });
    message.read = true;
    const result = await message.save();
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Something went wrong", err });
  }
};

module.exports = { newMessage, replyMessage, getAllMessages };
