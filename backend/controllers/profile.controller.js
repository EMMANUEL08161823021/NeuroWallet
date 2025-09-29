// controllers/profile.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/NewUser");
const MagicLink = require("../models/MagicLink");

// Helper: sign a JWT (you can replace with your signAccess util)
function signToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email, recentAuthAt: new Date().toISOString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Complete profile.
 * Two modes:
 *  - If request has req.user (authenticated), update their profile (existing flow).
 *  - If body includes `token`, validate magic-link token and create the user (signup) or finalize signin.
 *
 * Request body (signup via magic link):
 * {
 *   token: "<raw magic token>",        // required for magic-link flows
 *   firstName: "John",
 *   phone: "+2348012345678"
 * }
 *
 * Response:
 * { success: true, token: "<jwt>", user: { ... } }
 */
exports.completeProfile = async (req, res, next) => {
  try {
    // If user is already authenticated via middleware, update profile (existing flow)
    if (req.user && !req.body.token) {
      const { firstName, phone } = req.body;
      const userEmail = req.user.email;
      if (!firstName || !phone) {
        return res.status(400).json({ success: false, message: "Name and phone are required" });
      }

      const updatedUser = await User.findOneAndUpdate(
        { email: userEmail },
        { name: firstName, phone },
        { new: true }
      ).lean();

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const token = signToken(updatedUser);
      return res.json({
        success: true,
        message: "Profile completed successfully",
        token,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          wallet: updatedUser.wallet,
        },
      });
    }

    // Else: expect magic-link signup flow with a token
    const { token, firstName, phone } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    if (!firstName || !phone) {
      return res.status(400).json({ success: false, message: "Name and phone are required" });
    }

    // find candidate magic links (unused), newest first
    const candidates = await MagicLink.find({ used: false }).sort({ createdAt: -1 }).lean();

    let match = null;
    for (let link of candidates) {
      // compare raw token with stored hash
      // bcrypt.compare returns a boolean
      /* eslint-disable no-await-in-loop */
      if (await bcrypt.compare(token, link.tokenHash)) {
        match = link;
        break;
      }
    }

    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid or used token" });
    }

    if (new Date(match.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: "Token expired" });
    }

    // optional: if magic link had a clientNonce and you wish to validate here,
    // you can compare with a provided nonce in body. (Not required)
    // if (match.clientNonce && match.clientNonce !== req.body.nonce) { ... }

    // Check whether user already exists for that email (race protection)
    let user = await User.findOne({ email: match.email });

    if (user) {
      // If user already exists -> treat as signin: mark magic link used and return JWT
      await MagicLink.findByIdAndUpdate(match._id, { used: true }).exec();

      const tokenJwt = signToken(user);
      return res.json({ success: true, message: "Signed in", token: tokenJwt, user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
      }});
    }

    // Create new user
    const newUser = new User({
      name: firstName,
      email: match.email, // use email from the magic link
      phone,
      // if you want initial wallet structure:
      wallet: { balance: 0 },
      // add any other defaults required by your NewUser model
    });

    await newUser.save();

    // mark the magic link used now that account is created
    await MagicLink.findByIdAndUpdate(match._id, { used: true }).exec();

    const tokenJwt = signToken(newUser);
    return res.json({
      success: true,
      message: "Account created and signed in",
      token: tokenJwt,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        wallet: newUser.wallet,
      },
    });
  } catch (err) {
    console.error("❌ Error completing profile:", err);
    return next(err);
  }
};


// --- existing checkUser (you provided) ---
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
