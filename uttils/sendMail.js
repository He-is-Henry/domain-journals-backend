const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async ({
  from = `Domain Journals <${process.env.EMAIL_USER}>`,
  to,
  subject,
  html,
  text,
  cc,
  bcc,
}) => {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      cc,
      bcc,
    });
    console.log("Email sent:", data.id);
    return data;
  } catch (error) {
    console.error("Error sending mail:", error);
    throw error;
  }
};

module.exports = sendMail;
