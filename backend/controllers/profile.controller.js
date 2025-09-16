// controllers/profile.controller.js
const User = require("../models/User");
const fetch = require("node-fetch");
const { signAccess } = require("../utils/jwt");

exports.completeProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const userId = req.user.sub; // from JWT middleware

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // --- Call Paystack ---
    const customerRes = await fetch("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        first_name,
        last_name,
        phone,
      }),
    });

    const customerData = await customerRes.json();
    if (!customerData.status) {
      return res.status(400).json({ error: customerData.message });
    }

    const dvaRes = await fetch("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerData.data.customer_code,
        preferred_bank: "wema-bank",
      }),
    });

    const dvaData = await dvaRes.json();
    if (!dvaData.status) {
      return res.status(400).json({ error: dvaData.message });
    }

    // --- Update User ---
    user.name = `${first_name} ${last_name}`;
    user.phone = phone;
    user.dva = {
      account_number: dvaData.data.account_number,
      bank_name: dvaData.data.bank.name,
      account_name: dvaData.data.account_name,
      provider: "paystack",
    };
    await user.save();

    // --- Generate a fresh JWT ---
    const tokenJwt = signAccess({
      sub: user._id.toString(),   // ✅ ensure it's a plain string
      email: user.email,
      recentAuthAt: new Date().toISOString(), // ✅ safe value
    });

    res.json({
      success: true,
      message: "Profile completed successfully",
      dva: user.dva,
      token: tokenJwt, // ✅ new token if you want frontend to update auth
    });
  } catch (err) {
    next(err);
  }
};
