const { Manuscript } = require("../model/Manuscript");
const axios = require("axios");
const crypto = require("crypto");
const payForManuscript = async (req, res) => {
  const { id } = req.params;

  try {
    const manuscript = await Manuscript.findById(id);
    if (!manuscript) return res.status(404).json({ error: "Not found" });

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: manuscript.email,
        amount: 30000 * 100,
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
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  const signature = req.headers["x-paystack-signature"];
  if (hash !== signature) {
    return res.status(401).send("Unauthorized webhook");
  }
  const event = req.body;
  console.log(event);

  if (event.event === "charge.success") {
    const data = event.data;

    const manuscriptId = data.metadata?.manuscriptId;
    console.log(manuscriptId);

    if (manuscriptId) {
      await Manuscript.findByIdAndUpdate(manuscriptId, {
        status: "paid",
        paidAt: new Date(),
        paymentReference: data.reference,
      });

      console.log(`✅ Payment confirmed for ${manuscriptId}`);
    }
  }

  res.sendStatus(200);
};

module.exports = { payForManuscript, confirmPayment };
