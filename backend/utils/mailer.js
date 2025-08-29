// utils/mailer.js
const nodemailer = require("nodemailer");

// Create a reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // your email
    pass: process.env.SMTP_PASS, // app password or SMTP password
  },
});

/**
 * Send an email
 * @param {Object} opts
 * @param {string} opts.to - Recipient email
 * @param {string} opts.subject - Subject line
 * @param {string} opts.html - HTML body
 */
async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `"NeuroWallet" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send error:", err);
    throw err;
  }
}

module.exports = { sendEmail };
