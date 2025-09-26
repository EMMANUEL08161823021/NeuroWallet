// controllers/profile.controller.js
const User = require("../models/NewUser");
const jwt = require("jsonwebtoken");


exports.completeProfile = async (req, res, next) => {
  try {
    const { firstName, email, phone } = req.body;

    // Fallback: get email from JWT if not provided
    const userEmail = email || req.user?.email; // assuming you have auth middleware

    if (!userEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate inputs
    if (!firstName || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    // Update the user
    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail },
      { name: firstName, phone },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate JWT token after profile completion
    const token = jwt.sign(
      { sub: updatedUser._id, email: updatedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // token valid for 7 days
    );

    res.json({
      success: true,
      message: "Profile completed successfully",
      token, // return token to frontend
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        wallet: updatedUser.wallet,
      },
    });
  } catch (err) {
    console.error("❌ Error completing profile:", err);
    next(err);
  }
};

exports.checkUser = async (req, res) => {
  try {
    const { phone, q } = req.query;

    // prefer exact phone search if provided
    if (phone) {
      const user = await User.findOne({ phone: phone.trim() })
        .select("name phone")
        .lean();
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      return res.json({ success: true, user });
    }

    // fallback: simple free-text search (q) for name or phone (only when q >= 3 chars)
    if (q && q.trim().length >= 3) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const user = await User.findOne({ $or: [{ name: regex }, { phone: regex }] })
        .select("name phone")
        .lean();
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      return res.json({ success: true, user });
    }

    return res.status(400).json({ success: false, message: "Provide `phone` or `q` (>=3 chars)" });
  } catch (err) {
    console.error("User lookup error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




