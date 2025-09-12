// controllers/magiclink.controller.js
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const MagicLink = require("../models/MagicLink");
const User = require("../models/User");
const { signAccess } = require("../utils/jwt");
const { sendEmail } = require("../utils/mailer");

const MAGIC_TTL_MIN = 10;

// POST /api/auth/magic-link
async function requestMagicLink(req, res, next) {
  try {
    const { email, clientNonce } = req.body;

    const user = await User.findOne({ email }); // don’t reveal if missing

    // generate raw token
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = await bcrypt.hash(rawToken, 12);
    const expiresAt = new Date(Date.now() + MAGIC_TTL_MIN * 60 * 1000);

    await MagicLink.create({
      email,
      tokenHash,
      expiresAt,
      requestedIp: req.ip,
      requestedUa: req.headers["user-agent"],
      clientNonce,
      used: false,
    });

    if (user) {
      const url = new URL("https://neuro-wallet.vercel.app/api/auth/magic/verify"); // ✅ fixed route
      url.searchParams.set("token", rawToken);
      if (clientNonce) url.searchParams.set("nonce", clientNonce);
      url.searchParams.set("redirect", "/dashboard");

      await sendEmail({
        to: email,
        subject: "Your NeuroWallet sign-in link",
        html: `
          <p>Hi${user.name ? " " + user.name : ""},</p>
          <p>Click the button below to sign in. This link expires in ${MAGIC_TTL_MIN} minutes.</p>
          <p><a href="${url.toString()}" style="background:#111;color:#fff;padding:12px 16px;border-radius:6px;display:inline-block;">Sign in to NeuroWallet</a></p>
          <p>Or copy and paste this URL:<br>${url.toString()}</p>
        `,
      });
    }

    res.json({ ok: true, message: "If an account exists, a link was sent." });
  } catch (e) {
    next(e);
  }
}

// GET /api/auth/magic/verify
async function verifyMagicLink(req, res, next) {
  try {
    const { token, nonce, redirect = "/dashboard" } = req.query;
    if (!token) return res.status(400).send("Missing token");

    const match = await MagicLink.findOne({ used: false });
    if (!match) return res.status(400).send("Invalid or used link");

    // 🔑 Compare hashes, don’t look up raw token directly
    const valid = await bcrypt.compare(token, match.tokenHash);
    if (!valid) return res.status(400).send("Invalid or used link");

    if (match.expiresAt < new Date()) return res.status(400).send("Link expired");
    if (match.clientNonce && match.clientNonce !== nonce)
      return res.status(400).send("Link not valid on this device");

    const user = await User.findOne({ email: match.email });
    if (!user) return res.status(400).send("Invalid link");

    // mark link as used
    match.used = true;
    await match.save();

    const tokenJwt = signAccess({
      sub: user.id,
      email: user.email,
      recentAuthAt: new Date(),
    });

    // redirect back to SPA with token
    res.redirect(
      `https://neuro-wallet.vercel.app/auth/callback#token=${tokenJwt}&to=${encodeURIComponent(
        redirect
      )}`
    );
  } catch (e) {
    next(e);
  }
}

module.exports = { requestMagicLink, verifyMagicLink };
