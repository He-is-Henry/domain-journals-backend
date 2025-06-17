const express = require("express");
const router = express.Router();
const paymentController = require("../controller/paymentController");

router.post("/:id", paymentController.payForManuscript);

router.post(
  "/webhook",
  express.json({ type: "*/*" }),
  paymentController.confirmPayment
);

module.exports = router;
