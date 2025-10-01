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
// GET /api/wallet/verify/:reference
router.get("/verify/:reference", requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ msg: "Missing payment reference" });

    // Ensure we have a secret key available
    const PAYSTACK_SECRET_KEY = process.env.VITE_PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      console.error("Missing Paystack secret key in env");
      return res.status(500).json({ msg: "Server misconfiguration" });
    }

    // Call Paystack verify endpoint
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    // paystack returns a top-level boolean "status" and data in data.data
    const ok = verifyRes?.data?.status;
    const data = verifyRes?.data?.data;

    if (!ok || !data) {
      console.warn("Paystack returned unexpected shape:", verifyRes.data);
      return res.status(400).json({ msg: "Payment verification failed (unexpected response)" });
    }

    // Paystack transaction status field (e.g. "success")
    if (data.status !== "success") {
      return res.status(400).json({ msg: `Payment not successful: ${data.status || "unknown"}` });
    }

    // Find user by token subject
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Idempotency: check whether we've already recorded this reference
    const already = user.transactions?.some((t) => t.reference === data.reference);
    if (already) {
      return res.json({ msg: "Payment already processed", balance: user.wallet?.balance ?? 0 });
    }

    // Convert amount (Paystack amount is in kobo)
    const amountNaira = Number(data.amount) / 100;

    // Update wallet and transaction history
    user.wallet = user.wallet || { balance: 0 };
    user.wallet.balance = (user.wallet.balance || 0) + amountNaira;

    user.transactions = user.transactions || [];
    user.transactions.push({
      type: "fund",
      amount: amountNaira,
      reference: data.reference,
      status: "success",
      provider: "paystack",
      raw: data, // optional: keep full paystack payload (consider size/privacy)
      createdAt: new Date(),
    });

    await user.save();

    return res.json({
      msg: "Wallet funded successfully",
      balance: user.wallet.balance,
      reference: data.reference,
      amount: amountNaira,
    });
  } catch (err) {
    // Distinguish axios (Paystack) errors vs internal errors
    if (err.response) {
      // Paystack returned non-2xx
      console.error("Paystack error:", err.response.status, err.response.data);
      const msg = err.response.data?.message || err.response.data?.error || "Payment provider error";
      return res.status(502).json({ msg: `Payment provider error: ${msg}` });
    }

    if (err.code === "ECONNABORTED") {
      console.error("Paystack request timeout", err);
      return res.status(504).json({ msg: "Payment verification timed out" });
    }

    console.error("Internal error verifying payment:", err);
    return res.status(500).json({ msg: err.message || "Internal server error" });
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
