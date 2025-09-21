const express = require("express");
const axios = require("axios");
const User = require("../models/NewUser");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware to check auth
function auth(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
}

// Get user wallet + transactions
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user);
    res.json({ balance: user.wallet.balance, transactions: user.transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Initialize Paystack Payment
router.post("/fund", async (req, res) => {
  try {
    const { amount, email } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // in kobo
        callback_url: "http://localhost:5173/payment/callback", // 👈 must match your React route
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ msg: "Paystack init error" });
  }
});



// Internal Transfer
router.post("/transfer", auth, async (req, res) => {
  try {
    const { email, amount } = req.body; 
    const sender = await User.findById(req.user);
    const receiver = await User.findOne({ email });

    if (!receiver) return res.status(404).json({ msg: "Receiver not found" });
    if (sender.wallet.balance < amount) return res.status(400).json({ msg: "Insufficient balance" });

    // Update balances
    sender.wallet.balance -= amount;
    receiver.wallet.balance += amount;

    // ✅ log transactions
    sender.transactions.push({
      type: "transfer",
      amount,
      to: receiver.email,
      status: "success"
    });

    receiver.transactions.push({
      type: "transfer",
      amount,
      from: sender.email,
      status: "success"
    });

    await sender.save();
    await receiver.save();

    res.json({ msg: "Transfer successful", balance: sender.wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Verify Payment & Update Balance
router.get("/verify/:reference", async (req, res) => {

  console.log("req:", req);
  
  try {
    const { reference } = req.params;

    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;
    if (data.status === "success") {
      const user = await User.findOne({ email: data.customer.email });

      if (!user) return res.status(404).json({ msg: "User not found" });

      user.wallet.balance += data.amount / 100;
      user.transactions.push({
        type: "fund",
        amount: data.amount / 100,
        reference: data.reference,
        status: "success",
      });

      await user.save();

      return res.json({
        msg: "Wallet funded successfully",
        balance: user.wallet.balance,
      });
    }

    res.status(400).json({ msg: "Payment verification failed" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});



module.exports = router;
