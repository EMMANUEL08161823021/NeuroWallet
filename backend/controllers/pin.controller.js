// functions for setting and logging in with a PIN.

// controllers/pin.controller.js
const { Segments, Joi } = require("celebrate");
const User = require("../models/NewUser");
const { signAccess } = require("../utils/jwt");

// POST /api/pin/set  (requireAuth)
async function setPIN(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    await user.setPIN(req.body.pin);
    await user.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// POST /api/pin/login
async function loginWithPIN(req, res, next) {
  try {
    const { email, pin } = req.body;
    const user = await User.findOne({ email });

    console.log(user);
    
    if (!user || !(await user.validatePIN(pin))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    user.recentAuthAt = new Date();
    await user.save();
    const token = signAccess({ sub: user.id, email: user.email, recentAuthAt: user.recentAuthAt });
    res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
}

module.exports = { setPIN, loginWithPIN };
