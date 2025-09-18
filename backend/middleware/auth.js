const jwt = require("jsonwebtoken");
const User = require("../models/NewUser");

exports.requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find user by sub (Mongo _id) or fallback to email
    let user = await User.findById(decoded.sub);
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = { sub: decoded.sub, email: decoded.email }; // attach minimal user info
    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};
