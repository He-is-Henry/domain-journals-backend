const { Manuscript } = require("../model/Manuscript");
const axios = require("axios");
const crypto = require("crypto");
const sendMail = require("../uttils/sendMail");
const payForManuscript = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript) return res.status(404).json({ error: "Manuscript found" });
    const isNigerian = manuscript.country?.toLowerCase() === "nigeria";
    if (manuscript.status === "paid") {
      return res
        .status(400)
        .json({ error: "Payment already made for this manuscript" });
    }

    if (manuscript.status !== "approved") {
      return res.status(403).json({
        error: "This manuscript is not eligible for payment at this time",
      });
    }
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: manuscript.email,
        amount: isNigerian ? 30000 * 100 : 50 * 100,
        currency: isNigerian ? "NGN" : "USD",

        metadata: {
          manuscriptId: id,
          name: manuscript.name,
          journal: manuscript.journal,
        },
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data);
    res.json({ url: response.data.data.authorization_url });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
};

const confirmPayment = async (req, res) => {
  console.log("Trying to call webhook");

  const secret = process.env.PAYSTACK_SECRET_KEY;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.body)
    .digest("hex");

  const signature = req.headers["x-paystack-signature"];
  if (hash !== signature) {
    return res.status(401).send("Unauthorized webhook");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  console.log("from webhook", event);

  if (event.event === "charge.success") {
    const data = event.data;

    const manuscriptId = data.metadata?.manuscriptId;
    const name = data.metadata?.name;
    const email = data.customer?.email;

    if (manuscriptId) {
      await Manuscript.findByIdAndUpdate(manuscriptId, {
        status: "paid",
        paidAt: new Date(),
        paymentReference: data.reference,
      });

      console.log(`✅ Payment confirmed for ${manuscriptId}`);

      if (email) {
        await sendMail({
          to: email,
          subject: "Payment Confirmed – Domain Journals",
          text: `Dear ${name}, your payment has been received and confirmed. You'll be notified when your manuscript is published.`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
              <h2 style="color: green;">✅ Payment Confirmed</h2>
              <p>Dear ${name},</p>
              <p>We’ve successfully received and confirmed your payment for your manuscript submission.</p>
              <p>We’re currently working on publishing it on our website. You’ll be notified as soon as it goes live.</p>
              <p>Thank you for choosing <strong>Domain Journals</strong>.</p>
              <p style="margin-top: 20px;">Warm regards,<br/>Domain Journals Team</p>
            </div>
          `,
        });

        console.log("📧 Confirmation email sent to:", email);
      }
    }
  }

  res.sendStatus(200);
};

module.exports = { payForManuscript, confirmPayment };
