// controllers/payments.controller.js
const crypto = require("crypto");
const User = require("../models/NewUser");

const handlePaystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body.toString())
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body);

    if (event.event === "charge.success") {
      const data = event.data;

      const user = await User.findOne({
        "dva.account_number": data.authorization?.receiver_bank_account_number,
      });

      if (!user) {
        console.warn("⚠️ No matching user for this payment");
        return res.sendStatus(200);
      }

      const creditAmount = data.amount / 100; // Kobo → Naira
      user.walletBalance = (user.walletBalance || 0) + creditAmount;

      user.transactions.push({
        amount: creditAmount,
        type: "credit",
        ref: data.reference,
      });

      await user.save();
      console.log(`💰 Credited ₦${creditAmount} to ${user.email}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(500);
  }
};

module.exports = { handlePaystackWebhook };
