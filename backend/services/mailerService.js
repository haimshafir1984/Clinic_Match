const nodemailer = require("nodemailer");

let transporter = null;
let loggedMissingConfig = false;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number.parseInt(SMTP_PORT || "587", 10),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

async function sendOtpEmail(email, code) {
  const client = getTransporter();

  if (!client) {
    if (!loggedMissingConfig) {
      console.warn("SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — OTP codes will be logged to the server console instead of emailed.");
      loggedMissingConfig = true;
    }
    console.log(`[OTP] ${email} -> ${code} (valid 10 minutes)`);
    return { delivered: false };
  }

  await client.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "קוד ההתחברות שלך ל-ShiftMatch",
    text: `קוד ההתחברות שלך הוא: ${code}\nהקוד בתוקף ל-10 דקות.`,
    html: `<p>קוד ההתחברות שלך הוא: <b style="font-size:20px">${code}</b></p><p>הקוד בתוקף ל-10 דקות.</p>`,
  });

  return { delivered: true };
}

module.exports = { sendOtpEmail };
