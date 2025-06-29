const express = require("express");
const router = express.Router();
const paymentController = require("../controller/paymentController");
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.confirmPayment
);
router.post("/manuscript/:id", paymentController.payForManuscript);

module.exports = router;
