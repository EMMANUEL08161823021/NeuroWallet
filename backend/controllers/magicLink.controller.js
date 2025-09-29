const crypto = require("crypto");
const bcrypt = require("bcrypt");
const MagicLink = require("../models/MagicLink");
const User = require("../models/NewUser");
const { signAccess } = require("../utils/jwt");
const { sendEmail } = require("../utils/mailer");
const MAGIC_TTL_MIN = 10;
const expiresMin = MAGIC_TTL_MIN || 15;


// ... other requires (User, MagicLink, sendEmail, etc.)

async function requestMagicLink(req, res, next) {
  try {
    const { email: rawEmail, clientNonce } = req.body || {};
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, message: "Provide email" });

    const user = await User.findOne({ email }).lean().exec();
    const action = user ? "signin" : "signup";

    // generate token
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = await bcrypt.hash(rawToken, 12);
    const expiresAt = new Date(Date.now() + MAGIC_TTL_MIN * 60 * 1000);
    const expiresMin = MAGIC_TTL_MIN || 15;

    // create MagicLink record
    const ml = await MagicLink.create({
      email,
      tokenHash,
      expiresAt,
      requestedIp: req.headers["x-forwarded-for"] || req.ip,
      requestedUa: req.get("user-agent"),
      clientNonce: clientNonce || null,
      used: false,
      action,
      sendStatus: "pending",
    });

    // Build target verify URL (server-side verification endpoint)
    const appOrigin = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const verifyEndpoint = `${appOrigin}/api/auth/magic/verify`; // existing server verify endpoint
    const verifyUrl = new URL(verifyEndpoint);
    verifyUrl.searchParams.set("token", rawToken);
    if (clientNonce) verifyUrl.searchParams.set("nonce", clientNonce);

    // Prepare frontend redirect target included in email
    const frontendRedirect = action === "signin" ? "/dashboard" : "/complete-profile";
    verifyUrl.searchParams.set("redirect", frontendRedirect);

    // email copy differs by action
    const appName = "NeuroWallet";
    const safeName = (user && user.name) ? user.name : "";
    const verify = verifyUrl.toString();
    const preheader = `One-time ${action === "signin" ? "sign-in" : "signup"} link for ${appName} — expires in ${expiresMin} minutes.`;

    // Plain-text fallbacks
    const signinText = `Hi${safeName ? " " + safeName : ""},

Use this link to sign in to ${appName}. It expires in ${expiresMin} minutes.

${verify}

If you didn't request this, ignore this message.

— ${appName} Support
`;

    const signupText = `Hi${safeName ? " " + safeName : ""},

Welcome to ${appName}! Click the link below to continue your signup. The link expires in ${expiresMin} minutes.

${verify}

If you didn't request this, ignore this message.

— ${appName} Support
`;

    // HTML templates (inline styles for maximum email compatibility)
    const signinHtml = `
<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#f4f6fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#102a43;">
  <div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="padding:24px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" width="600" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(16,42,67,0.06);">
        <tr><td style="padding:20px 28px; border-bottom:1px solid #eef3f9;">
          <div style="display:flex;align-items:center;gap:12px"><div style="font-weight:800;color:#0b63d6;font-size:18px">💡 ${appName}</div><div style="color:#97a6b4;font-size:13px">Secure • Accessible</div></div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#102a43">Hi${safeName ? " " + safeName : ""},</h1>
          <p style="margin:0 0 18px 0;line-height:1.5;color:#334e68;">
            Use the button below to securely sign in to your ${appName} account. This link expires in <strong>${expiresMin} minute${expiresMin>1?"s":""}</strong>.
          </p>
          <div style="text-align:center;margin:22px 0;">
            <a href="${verify}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#0b63d6;color:#ffffff;text-decoration:none;font-weight:700;">Sign in to ${appName}</a>
          </div>
          <p style="margin:0 0 8px 0;color:#556b7a;font-size:13px;line-height:1.4;">Or copy & paste this link into your browser:</p>
          <p style="word-break:break-all;font-size:13px;color:#0b63d6;margin:8px 0 0 0;"><a href="${verify}" style="color:#0b63d6;text-decoration:underline;">${verify}</a></p>
          <hr style="border:none;border-top:1px solid #eef3f9;margin:20px 0;" />
          <p style="margin:0;color:#8899a6;font-size:13px;line-height:1.5;">If you didn't request this link, ignore this email — no changes were made to your account.</p>
          <p style="margin:12px 0 0 0;color:#8899a6;font-size:13px;line-height:1.4;">Need help? Reply to this email or contact support at <a href="mailto:support@your-domain.com" style="color:#0b63d6;">support@your-domain.com</a>.</p>
        </td></tr>
        <tr><td style="background:#f7fbff;padding:16px 28px 20px 28px;border-top:1px solid #e6eef9;text-align:center;color:#97a6b4;font-size:12px;">
          <div>${appName} • Secure accessible banking</div>
          <div style="margin-top:6px;">© ${new Date().getFullYear()} ${appName}</div>
        </td></tr>
      </table>
      <div style="height:12px;"></div>
      <div style="font-size:11px;color:#97a6b4;max-width:600px;text-align:center;">This is a one-time sign-in link. It expires in ${expiresMin} minute${expiresMin>1?"s":""}.</div>
    </td></tr>
  </table>
</body>
</html>
`;

    const signupHtml = `
<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;background:#f3f7fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#102a43;">
  <div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="padding:24px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" width="600" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(16,42,67,0.06);">
        <tr><td style="padding:20px 28px; border-bottom:1px solid #eef3f9;">
          <div style="display:flex;align-items:center;gap:12px"><div style="font-weight:800;color:#0b63d6;font-size:18px">💡 ${appName}</div><div style="color:#97a6b4;font-size:13px">Secure • Accessible</div></div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px 0;font-size:20px;color:#102a43">Welcome${safeName ? " " + safeName : ""} 👋</h1>
          <p style="margin:0 0 18px 0;line-height:1.5;color:#334e68;">
            Thanks for choosing ${appName}. Click the button below to continue creating your account. This link expires in <strong>${expiresMin} minute${expiresMin>1?"s":""}</strong>.
          </p>
          <div style="text-align:center;margin:22px 0;">
            <a href="${verify}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#0b63d6;color:#ffffff;text-decoration:none;font-weight:700;">Continue creating your account</a>
          </div>
          <p style="margin:0 0 8px 0;color:#556b7a;font-size:13px;">After you complete your profile we'll help you set up accessibility features like voice navigation and quick-keys.</p>
          <p style="margin:14px 0 0 0;font-size:13px;color:#556b7a;">Or paste this link into your browser:<br/><a href="${verify}" style="color:#0b63d6;word-break:break-all;">${verify}</a></p>
          <hr style="border:none;border-top:1px solid #eef3f9;margin:20px 0;" />
          <p style="margin:0;color:#8899a6;font-size:13px;line-height:1.5;">If you didn't request this, ignore this email — no changes were made to your account.</p>
        </td></tr>
        <tr><td style="background:#f7fbff;padding:16px 28px 20px 28px;border-top:1px solid #e6eef9;text-align:center;color:#97a6b4;font-size:12px;">
          <div>${appName} • Secure accessible banking</div>
          <div style="margin-top:6px;">© ${new Date().getFullYear()} ${appName}</div>
        </td></tr>
      </table>
      <div style="height:12px;"></div>
      <div style="font-size:11px;color:#97a6b4;max-width:600px;text-align:center;">This link expires in ${expiresMin} minute${expiresMin>1?"s":""}.</div>
    </td></tr>
  </table>
</body>
</html>
`;

    const html = action === "signin" ? signinHtml : signupHtml;
    const text = action === "signin" ? signinText : signupText;

    try {
      const info = await sendEmail({
        to: email,
        subject: action === "signin" ? "🔐 Your NeuroWallet sign-in link" : "🔑 Complete your NeuroWallet signup",
        text,
        html,
      });

      // update send status on MagicLink
      await MagicLink.findByIdAndUpdate(ml._id, {
        sendStatus: "sent",
        sendInfo: info,
      }).exec();
    } catch (sendErr) {
      console.error("Magic link email send failed:", sendErr);
      await MagicLink.findByIdAndUpdate(ml._id, {
        sendStatus: "failed",
        sendError: String(sendErr?.message || sendErr),
      }).exec();
      // don't throw - keep response generic
    }

    // generic response to avoid account enumeration
    return res.json({ ok: true, message: "If an account exists, a link was sent." });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestMagicLink };


// GET /api/auth/magic/verify
// controllers/auth.js (modified verifyMagicLink)
async function verifyMagicLink(req, res, next) {
  try {
    const { token, nonce, redirect = "/dashboard" } = req.query;
    if (!token) return res.status(400).send("Missing token");

    // find candidate unused links (recent first)
    const candidates = await MagicLink.find({ used: false }).sort({ createdAt: -1 });
    let match = null;
    for (let link of candidates) {
      if (await bcrypt.compare(token, link.tokenHash)) {
        match = link;
        break;
      }
    }

    if (!match) return res.status(400).send("Invalid or used link");
    if (match.expiresAt < new Date()) return res.status(400).send("Link expired");
    if (match.clientNonce && match.clientNonce !== nonce) {
      return res.status(400).send("Link not valid on this device");
    }

    const user = await User.findOne({ email: match.email });

    if (match.action === "signup" && !user) {
      // Redirect to frontend complete-profile with the raw token — do NOT mark used yet.
      // Use redirect param already set to "/complete-profile"
      // Pass the raw token in the URL (query or fragment); fragment avoids server logs.
      const frontendOrigin = process.env.VITE_FRONTEND_URL || "http://localhost:5173";
      // put token in hash so browser can read it client-side without server logs
      const frontendUrl = `${frontendOrigin}/complete-profile#token=${encodeURIComponent(token)}&email=${encodeURIComponent(match.email)}`;
      return res.redirect(frontendUrl);
    }

    if (!user) {
      // No user but action is signin — fallback to signup flow
      const frontendOrigin = process.env.VITE_FRONTEND_URL || "http://localhost:5173";
      const frontendUrl = `${frontendOrigin}/complete-profile#token=${encodeURIComponent(token)}&email=${encodeURIComponent(match.email)}`;
      return res.redirect(frontendUrl);
    }

    // action is signin and user exists -> mark used and issue JWT
    match.used = true;
    await match.save();

    const tokenJwt = signAccess({
      sub: user._id,
      email: user.email,
      recentAuthAt: new Date(),
    });

    let nextPath = redirect;
    if (!user.name || !user.phone) {
      nextPath = "/complete-profile";
    }

    // Redirect to frontend callback with jwt in fragment
    const frontendCallbackBase = `${process.env.VITE_FRONTEND_URL}/auth/callback`;
    return res.redirect(`${frontendCallbackBase}#token=${tokenJwt}&to=${encodeURIComponent(nextPath)}`);
  } catch (e) {
    next(e);
  }
}


module.exports = { requestMagicLink, verifyMagicLink };
