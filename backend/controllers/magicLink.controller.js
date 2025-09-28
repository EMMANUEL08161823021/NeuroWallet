const crypto = require("crypto");
const bcrypt = require("bcrypt");
const MagicLink = require("../models/MagicLink");
const User = require("../models/NewUser");
const { signAccess } = require("../utils/jwt");
const { sendEmail } = require("../utils/mailer");
const nodemailer = require("nodemailer");
const MAGIC_TTL_MIN = 10;
const expiresMin = MAGIC_TTL_MIN || 15;


// POST /api/auth/magic-link
async function requestMagicLink(req, res, next) {
  try {
    const { email, clientNonce } = req.body;

    const user = await User.findOne({ email }); // don’t reveal if missing

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
      // const url = new URL("http://localhost:9000/api/auth/magic/verify");
      const url = new URL(`${process.env.APP_URL}/api/auth/magic/verify`);
      url.searchParams.set("token", rawToken);
      if (clientNonce) url.searchParams.set("nonce", clientNonce);
      url.searchParams.set("redirect", "/dashboard");

      // You can adjust APP_ORIGIN or ASSET_URL to where your logo is hosted
      // const APP_ORIGIN = process.env.APP_URL?.replace(/\/$/, "") || `https://${process.env.DOMAIN || "your-domain.com"}`;

      const rawName = user?.name ? user.name : "";
      const verifyUrl = url.toString();
      

      const info = await sendEmail({
        to: email,
        subject: "🔐 Your NeuroWallet sign-in link",
        // Plain-text fallback (good for deliverability and accessibility)
        text: `Hi ${rawName},

        Click the link below to sign in to NeuroWallet. This link expires in ${expiresMin} minutes.

        ${verifyUrl}

        If you didn't request this, ignore this email.

        — NeuroWallet Support
        `,
        // HTML version (inline styles for best email client support)
        html: `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Sign in to NeuroWallet</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#102a43;">
          <!-- Preheader (hidden but shown in inbox preview) -->
          <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">
            Use this secure, one-time link to sign in to NeuroWallet. It expires in ${expiresMin} minutes.
          </span>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6fb;padding:24px 0;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(16,42,67,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="padding:20px 28px; text-align:left;">
                      <span style="font-weight:700;font-size:18px;margin-left:10px;color:#0b63d6;vertical-align:middle;">NeuroWallet</span>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:24px 28px 12px 28px;">
                      <h1 style="margin:0 0 8px 0;font-size:20px;color:#102a43">Hi${rawName ? " " + rawName : ""},</h1>
                      <p style="margin:0 0 18px 0;line-height:1.5;color:#334e68;">
                        Use the button below to securely sign in to your NeuroWallet account. For your safety this link expires in <strong>${expiresMin} minutes</strong>.
                      </p>

                      <div style="text-align:center;margin:22px 0;">
                        <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer"
                          style="display:inline-block;padding:14px 20px;border-radius:10px;background:#0b63d6;color:#ffffff;text-decoration:none;font-weight:600;box-shadow:0 6px 18px rgba(11,99,214,0.18);">
                          Sign in to NeuroWallet
                        </a>
                      </div>

                      <p style="margin:8px 0 0 0;line-height:1.4;color:#556b7a;font-size:14px;">
                        Or copy & paste this link into your browser:
                      </p>
                      <p style="word-break:break-all;font-size:12px;color:#0b63d6;margin:8px 0 0 0;">
                        <a href="${verifyUrl}" style="color:#0b63d6;text-decoration:underline;">${verifyUrl}</a>
                      </p>

                      <hr style="border:none;border-top:1px solid #eef3f9;margin:20px 0;" />

                      <p style="margin:0;color:#556b7a;font-size:13px;line-height:1.5;">
                        If you didn't request this link, you can safely ignore this email — no changes were made to your account.
                      </p>

                      <p style="margin:12px 0 0 0;color:#556b7a;font-size:13px;line-height:1.4;">
                        Need help? Reply to this email or contact support at <a href="mailto:support@your-domain.com" style="color:#0b63d6;text-decoration:underline;">support@your-domain.com</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f7fbff;padding:16px 28px 20px 28px;border-top:1px solid #e6eef9;text-align:center;color:#8899a6;font-size:12px;">
                      <div>NeuroWallet • Secure accessible banking</div>
                      <div style="margin-top:6px;">© ${new Date().getFullYear()} NeuroWallet — All rights reserved</div>
                    </td>
                  </tr>
                </table>

                <!-- Small mobile spacer -->
                <div style="height:12px;"></div>

                <!-- small text for sighted users: ensure we don't leak account-existence info -->
                <div style="font-size:11px;color:#97a6b4;max-width:600px;text-align:center;">
                  This is a one-time link that grants temporary sign-in access. If you did not request it, no action is necessary.
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
      });

      // Dev: log preview URL
      if (process.env.NODE_ENV !== "production") {
        console.log("💌 Preview link:", nodemailer.getTestMessageUrl(info));
      }
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
    if (!user) return res.status(400).send("Invalid link");

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

    res.redirect(
      `https://neuro-wallet.vercel.app/auth/callback#token=${tokenJwt}&to=${encodeURIComponent(nextPath)}`
    );
  } catch (e) {
    next(e);
  }
}

module.exports = { requestMagicLink, verifyMagicLink };
