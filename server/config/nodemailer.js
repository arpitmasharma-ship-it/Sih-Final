const nodemailer = require('nodemailer');
const config = require('./env');

let transporter = null;

function getTransporter() {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured - log instead of sending (documented behaviour)
    console.log(`[MAIL:DRYRUN] to=${to} subject="${subject}"`);
    return { delivered: false, dryRun: true };
  }
  return t.sendMail({ from: config.smtp.from, to, subject, html, text });
}

module.exports = { sendMail, getTransporter };
