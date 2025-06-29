const { Newsletter } = require("../model/Newsletter");
const sendMail = require("../uttils/sendMail");

const subscribe = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const alreadySubscribed = await Newsletter.findOne({ email });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    if (alreadySubscribed) {
      return res.status(409).json({ message: "Already subscribed" });
    }

    const subscription = new Newsletter({ email });
    await subscription.save();
    await sendMail({
      from: "Domain Journals <updates@domainjournals.com>",

      to: email,
      subject: "Thanks for Subscribing!",
      html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Welcome to Domain Journals 📚</h2>
          <p>Thank you for choosing to subscribe to our newsletter.</p>
          <p>You’ll now receive updates about our latest publications and news.</p>
          <p>– The Domain Journals Team</p>
        </div>
      `,
    });

    res.status(201).json({ message: "Subscribed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const sendNewsletter = async (req, res) => {
  const { subject, body } = req.body;

  if (!subject || !body) {
    return res.status(400).json({ error: "Subject and body are required." });
  }

  try {
    const subscribers = await Newsletter.find({}, "email");

    if (subscribers.length === 0) {
      return res.status(404).json({ error: "No subscribers found." });
    }

    const bccList = subscribers.map((s) => s.email);

    await sendMail({
      from: "Domain Journals <updates@domainjournals.com>",
      to: "no-reply@domainjournals.com",
      bcc: bccList,
      subject,
      html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
    });

    res.status(200).json({ message: "Newsletter sent." });
  } catch (err) {
    console.error("Newsletter send error:", err);
    res.status(500).json({ message: "Failed to send newsletter." });
  }
};

module.exports = {
  subscribe,
  sendNewsletter,
};
