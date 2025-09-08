// utils/mailer.js

const dotenv = require('dotenv')
dotenv.config();
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,      // smtp.mailtrap.io
  port: Number(process.env.SMTP_PORT || 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"NeuroWallet" <no-reply@neurowallet.test>',
    to, subject, html, text,
  });
  return info;
}
module.exports = { sendEmail };
