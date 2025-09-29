// controllers/profile.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/NewUser");
const MagicLink = require("../models/MagicLink");

// Helper: sign a JWT (you can replace with your signAccess util)

// Helper to sign JWT
const signToken = (user) => jwt.sign(
  { sub: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


exports.completeProfile = async (req, res, next) => {
  try {
    const { firstName, phone, token: magicToken } = req.body;
    let user = null;

    // 1️⃣ Check JWT from header (passkey login)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const jwtToken = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        console.log("Decoded JWT:", decoded);

        user = await User.findById(decoded.sub);
        if (!user && decoded.email) {
          user = await User.findOne({ email: decoded.email });
        }
        console.log("User from JWT:", user ? user.email : null);
      } catch (err) {
        console.warn("Invalid JWT, will fallback to magic token");
      }
    }

    // 2️⃣ Check magic link token if no JWT user
    if (!user && magicToken) {
      // console.log("Checking magic token:", magicToken);

      const candidates = await MagicLink.find({ used: false }).sort({ createdAt: -1 });
      // console.log("Unused magic links:", candidates.map(c => ({ email: c.email, used: c.used, createdAt: c.createdAt })));

      let match = null;
      for (let link of candidates) {
        if (await bcrypt.compare(magicToken, link.tokenHash)) {
          match = link;
          break;
        }
      }

      if (!match) {
        console.warn("No matching magic token found");
        return res.status(400).json({ success: false, message: "Invalid or used magic token" });
      }

      if (match.expiresAt < new Date()) {
        console.warn("Magic token expired:", match.expiresAt);
        return res.status(400).json({ success: false, message: "Token expired" });
      }

      user = await User.findOne({ email: match.email });
      if (!user) {
        console.log("Creating new user from magic token:", match.email);
        user = new User({
          name: firstName || "",
          email: match.email,
          phone: phone || "",
          wallet: { balance: 0 },
        });
        await user.save();
      }

      console.log("Marking magic token as used:", match._id);
      await MagicLink.findByIdAndUpdate(match._id, { used: true }).exec();
    }

    if (!user) {
      console.error("Unauthorized: no JWT user and no valid magic token");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 3️⃣ Update profile if firstName or phone provided
    if (firstName) user.name = firstName;
    if (phone) user.phone = phone;
    await user.save();
    // console.log("Updated user profile:", { name: user.name, phone: user.phone });

    // 4️⃣ Sign new JWT and return
    const tokenJwt = signToken(user);
    // console.log("Returning new JWT:", tokenJwt);

    res.json({
      success: true,
      message: "Profile completed successfully",
      token: tokenJwt,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        wallet: user.wallet,
      },
    });
  } catch (err) {
    console.error("❌ Error completing profile:", err);
    next(err);
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
