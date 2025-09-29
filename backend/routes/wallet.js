const express = require("express");
const axios = require("axios");
const User = require("../models/NewUser");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../middleware/auth");
const mongoose = require("mongoose")
const Transaction = require("../models/Transaction");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const router = express.Router();


async function resolveAccount(account_number, bank_code) {
  if (!account_number || !bank_code) throw new Error("Missing params");
  const url = "https://api.paystack.co/bank/resolve";
  const params = { account_number, bank_code };

  const resp = await axios.get(url, {
    params,
    headers: {
      Authorization: `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}`,
    },
  });

  // resp.data.data.account_name contains the resolved name
  return resp.data;
}

// Normalize and validate phone to E.164
function normalizePhone(rawPhone, defaultCountry = "NG") {
  if (!rawPhone) return null;
  try {
    const pn = parsePhoneNumberFromString(String(rawPhone), defaultCountry);
    if (!pn || !pn.isValid()) return null;
    return pn.number; // e.g. +2348012345678
  } catch {
    return null;
  }
}

// Get user wallet + transactions

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub); // <- use sub from JWT
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      balance: user.wallet.balance,
      transactions: user.transactions,
      email: user.email,
      name: user.name,
      phone: user.phone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Initialize Paystack Payment NOW WORKS LIVE TO FUND PAYSTACK ACCOUNT
router.post("/fund", requireAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    // Get email from middleware
    const email = req.user?.email;
    if (!email) {
      return res.status(400).json({ error: "User email not found" });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // in kobo
        callback_url: "https://neuro-wallet.vercel.app/payment/callback", // 👈 must match your React route
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



router.get("/profile", requireAuth, async (req, res) => {
  try {
    const email = req.user.email; // ✅ decoded from JWT inside requireAuth

    // console.log("Decoded email:", email);

    const user = await User.findOne({ email });

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        kycLevel: user.kycLevel || "Tier 1",
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// POST /api/wallet/recipient
router.post("/recipient", requireAuth, async (req, res) => {
  const { name, account_number, bank_code, currency = "NGN" } = req.body;
  if (!name || !account_number || !bank_code) {
    return res.status(400).json({ msg: "Missing recipient info" });
  }
  try {
    const response = await axios.post(
      "https://api.paystack.co/transferrecipient",
      { type: "nuban", name, account_number, bank_code, currency },
      { headers: { Authorization: `Bearer ${process.env.VITE_PAYSTACK_SECRET_KEY}` } }
    );
    // Save response.data.data.recipient_code in your DB linked to the user
    res.json({ success: true, recipient: response.data.data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});



// usage in a route
router.get("/resolve-account", requireAuth, async (req, res) => {
  try {
    const { account_number, bank_code } = req.query;
    const result = await resolveAccount(account_number, bank_code);
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});



// POST /api/wallet/transfer
router.post("/transfer", requireAuth, async (req, res) => {
  const { recipient_code, amount } = req.body; // amount in NGN
  const user = await User.findById(req.user.sub);

  if (!recipient_code || !amount || amount <= 0) return res.status(400).json({ msg: "Invalid input" });
  if (user.wallet.balance < amount) return res.status(400).json({ msg: "Insufficient balance" });

  try {
    // Create internal transaction record (pending)
    const tx = {
      type: "transfer",
      amount,
      to: recipient_code,
      status: "pending",
      reference: `tx_${Date.now()}` // or use a UUID
    };
    user.transactions.push(tx);
    user.wallet.balance -= amount; // optimistically deduct; handle rollback if failure
    await user.save();

    // Initiate Paystack transfer (amount in kobo)
    const paystackRes = await axios.post(
      "https://api.paystack.co/transfer",
      { source: "balance", amount: Math.round(amount * 100), recipient: recipient_code, reference: tx.reference },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    // Update transaction with immediate response
    tx.paystack = paystackRes.data.data;
    tx.status = paystackRes.data.data.status === "success" ? "success" : "processing";
    await user.save();

    res.json({ success: true, transfer: paystackRes.data.data });
  } catch (err) {
    // Rollback internal balance if needed
    // (fetch user again or handle properly)
    console.error(err);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});


// POST /api/paystack/webhook
router.post("/webhook", express.json({ type: "*/*" }), async (req, res) => {
  // Verify webhook signature if you want (recommended)
  const event = req.body;
  // Example: event.event === 'transfer.success'
  if (event.event === "transfer.success") {
    const data = event.data; // contains reference, recipient, amount, etc.
    // Find the user transaction by reference and mark success
    await User.updateOne({ "transactions.reference": data.reference }, {
      $set: { "transactions.$.status": "success", "transactions.$.paystack": data }
    });
  } else if (event.event === "transfer.failed") {
    // handle failed: refund internal balance or mark failed
    await User.updateOne({ "transactions.reference": event.data.reference }, {
      $set: { "transactions.$.status": "failed", "transactions.$.paystack": event.data }
    });
    // Optionally credit user back
  }
  res.json({ received: true });
});



// Verify Payment & Update Balance
router.get("/verify/:reference", requireAuth, async (req, res) => {
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
      const user = await User.findById(req.user.sub); // <- use sub here

      if (!user) return res.status(404).json({ msg: "User not found" });

      user.wallet.balance += data.amount / 100; // Paystack sends kobo
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


// POST /api/wallet/transfer/internal
// body: { toPhone, amount }
// requireAuth populates req.user.sub
router.post("/internal-transfer", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const fromUserId = req.user.sub;
    const { phone, amount } = req.body;

    if (!phone || !amount || Number(amount) <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Invalid input" });
    }

    const normalized = normalizePhone(phone, "NG");
    if (!normalized) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Invalid phone number format" });
    }

    // NOTE: decide if you store amounts in minor units. Here we use decimals as schema expects Number.
    const amt = Math.round(Number(amount) * 100) / 100;

    // find recipient
    const toUser = await User.findOne({ phone: normalized }).session(session);
    if (!toUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, msg: "Recipient not found" });
    }

    // prevent self-transfer
    if (toUser._id.equals(fromUserId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Cannot transfer to yourself" });
    }

    // decrement sender atomically only if they have enough balance
    const sender = await User.findOneAndUpdate(
      { _id: fromUserId, "wallet.balance": { $gte: amt } },
      { $inc: { "wallet.balance": -amt } },
      { new: true, session }
    );

    if (!sender) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, msg: "Insufficient balance" });
    }

    // credit recipient
    await User.updateOne(
      { _id: toUser._id },
      { $inc: { "wallet.balance": amt } },
      { session }
    );

    // create transaction documents (DEBIT for sender, CREDIT for recipient)
    const refBase = uuidv4();
    const debitRef = `INT-DEBIT-${refBase}`;
    const creditRef = `INT-CREDIT-${refBase}`;

    const timestamp = new Date();

    const debitDoc = {
      ref: debitRef,
      accountId: fromUserId,         // your schema expects accountId
      type: "DEBIT",                 // matches enum
      amount: amt,
      memo: `Internal transfer to ${normalized}`,
      counterparty: normalized,
      currency: "NGN",
      meta: { toUserId: toUser._id.toString(), initiatedBy: fromUserId.toString() },
      createdAt: timestamp,
    };

    const creditDoc = {
      ref: creditRef,
      accountId: toUser._id,
      type: "CREDIT",
      amount: amt,
      memo: `Internal transfer from ${sender.email || sender.phone || fromUserId}`,
      counterparty: sender.phone || sender.email || fromUserId,
      currency: "NGN",
      meta: { fromUserId: fromUserId.toString(), initiatedBy: fromUserId.toString() },
      createdAt: timestamp,
    };

    const [debitTx, creditTx] = await Transaction.create([debitDoc, creditDoc], { session, ordered: true } );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Internal transfer successful",
      debitTx,
      creditTx,
      newSenderBalance: sender.wallet.balance, // updated sender balance
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // If you removed funds but failed later, ensure you reconcile / re-credit if necessary.
    console.error("Internal transfer error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});




module.exports = router;
