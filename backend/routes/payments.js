// routes/payments.js
const express = require("express");
const { handlePaystackWebhook } = require("../controllers/paymentsController");

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handlePaystackWebhook
);

module.exports = router;
