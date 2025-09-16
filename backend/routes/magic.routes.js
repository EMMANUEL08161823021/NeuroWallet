const express = require("express");
const { requestMagicLink, verifyMagicLink } = require("../controllers/magicLink.controller");
const { authLimiter } = require("../middleware/limit");
const fetch = require("node-fetch");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Request a magic link (user submits email)
router.post("/magic-link", authLimiter, requestMagicLink);

// Verify the magic link (clicked from email)
router.get("/magic/verify", verifyMagicLink);


router.post("/provision", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Already has virtual account
    if (user.virtualAccount) {
      return res.json({ ok: true, virtualAccount: user.virtualAccount });
    }

    // ✅ Call Paystack Dedicated Account API
    const paystackRes = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: user.email,
        preferred_bank: "providus-bank", // or leave blank for auto
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error("Paystack DVA error:", paystackData);
      return res.status(400).json({ error: "Failed to provision account" });
    }

    // ✅ Save account to user
    user.wallet = { balance: 0 };
    user.virtualAccount = {
      bank: paystackData.data.bank.name,
      accountNumber: paystackData.data.account_number,
      accountName: paystackData.data.account_name,
    };
    await user.save();

    res.json({ ok: true, virtualAccount: user.virtualAccount });
  } catch (err) {
    console.error("Wallet provision error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
