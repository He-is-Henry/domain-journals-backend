const nodemailer = require("nodemailer");

const isProd = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: isProd ? 465 : 587,
  secure: isProd,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Domain Journals" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending mail:", error);
    throw error;
  }
};

module.exports = sendMail;
