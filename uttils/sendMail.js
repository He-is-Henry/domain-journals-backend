const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false, // STARTTLS
  requireTLS: true, // enforce TLS
  auth: {
    user: process.env.EMAIL_USER, // your Zoho email
    pass: process.env.EMAIL_PASS, // the new App Password
  },
  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: false,
  },
  family: 4, // force IPv4 to avoid Render+Zoho timeout
});

const sendMail = async ({
  from = `"Domain Journals" <${process.env.EMAIL_USER}>`,
  to,
  bcc,
  subject,
  text,
  html,
  cc,
}) => {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      bcc,
      cc,
    });
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending mail:", error);
    throw error;
  }
};

module.exports = sendMail;
