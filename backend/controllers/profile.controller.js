// controllers/profile.controller.js
const User = require("../models/NewUser");


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

    res.json({
      message: "Profile completed successfully",
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




