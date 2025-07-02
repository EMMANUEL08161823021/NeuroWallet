const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
require('dotenv').config();

console.log('Environment variables:', {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
});

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.EMAIL_PASS,
    },
}));

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: 'Test Email from GadgetShop',
    text: 'This is a test email to verify SendGrid configuration.',
};

transporter.sendMail(mailOptions)
    .then(() => console.log('Test email sent to:', process.env.ADMIN_EMAIL))
    .catch(err => {
        console.error('Test email error:', {
            message: err.message,
            code: err.code,
            responseCode: err.response ? err.response.statusCode : 'No response code',
            responseBody: err.response ? err.response.body : 'No response body',
        });
    });