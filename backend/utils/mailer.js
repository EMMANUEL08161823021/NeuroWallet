// mailer.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
      text,
    });

    console.log("✅ Email sent:", info);
    return info;
  } catch (err) {
    console.error("❌ Email error:", err);
    throw err;
  }
}

module.exports = { sendEmail };
