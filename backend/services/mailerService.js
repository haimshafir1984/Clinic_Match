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
    // Fail fast instead of hanging the request if the SMTP server is
    // unreachable/misconfigured — these are all in milliseconds.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  return transporter;
}

// Email delivery must never be able to hang or fail the OTP request itself —
// the code is already persisted in the DB by the time this runs (see
// issueOtp in server.js), so a slow/broken SMTP server should only mean the
// user doesn't get the email, not that the API call times out.
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

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "קוד ההתחברות שלך ל-ShiftMatch",
      text: `קוד ההתחברות שלך הוא: ${code}\nהקוד בתוקף ל-10 דקות.`,
      html: `<p>קוד ההתחברות שלך הוא: <b style="font-size:20px">${code}</b></p><p>הקוד בתוקף ל-10 דקות.</p>`,
    });
    return { delivered: true };
  } catch (err) {
    console.error("OTP EMAIL SEND ERROR:", err);
    console.log(`[OTP fallback] ${email} -> ${code} (valid 10 minutes)`);
    return { delivered: false, error: err.message };
  }
}

module.exports = { sendOtpEmail };
