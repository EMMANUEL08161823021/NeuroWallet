const nodemailer = require("nodemailer");

let transporter;

async function initMailer() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail", // Gmail service
      auth: {
        user: process.env.SMTP_USER, // your Gmail address
        pass: process.env.SMTP_PASS, // your Google App Password (not your normal password)
      },
    });
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) await initMailer();

  try {
    const info = await transporter.sendMail({ from: `"NeuroWallet" <${process.env.SMTP_USER}>`, to, subject, html, text });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    if (err.response) console.error("SMTP response:", err.response);
    throw err;
  }

}

module.exports = { sendEmail };
