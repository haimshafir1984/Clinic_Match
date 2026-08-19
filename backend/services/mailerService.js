const nodemailer = require("nodemailer");

let transporter = null;
let loggedMissingConfig = false;

// Render's free tier blocks all outbound SMTP ports (25/465/587), so raw
// SMTP (Gmail included) cannot work from a free web service no matter how
// it's configured. Resend's HTTP API runs over regular HTTPS (443), which
// isn't blocked — prefer it when RESEND_API_KEY is set, and fall back to
// SMTP (useful on a paid Render instance or another host) otherwise.
async function sendViaResend(email, code) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "ShiftMatch <onboarding@resend.dev>",
      to: [email],
      subject: "קוד ההתחברות שלך ל-ShiftMatch",
      text: `קוד ההתחברות שלך הוא: ${code}\nהקוד בתוקף ל-10 דקות.`,
      html: `<p>קוד ההתחברות שלך הוא: <b style="font-size:20px">${code}</b></p><p>הקוד בתוקף ל-10 דקות.</p>`,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

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

async function sendViaSmtp(email, code) {
  const client = getTransporter();
  if (!client) return false;

  await client.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "קוד ההתחברות שלך ל-ShiftMatch",
    text: `קוד ההתחברות שלך הוא: ${code}\nהקוד בתוקף ל-10 דקות.`,
    html: `<p>קוד ההתחברות שלך הוא: <b style="font-size:20px">${code}</b></p><p>הקוד בתוקף ל-10 דקות.</p>`,
  });
  return true;
}

// Email delivery must never be able to hang or fail the OTP request itself —
// the code is already persisted in the DB by the time this runs (see
// issueOtp in server.js), so a slow/broken mail provider should only mean
// the user doesn't get the email, not that the API call times out.
async function sendOtpEmail(email, code) {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(email, code);
      return { delivered: true, via: "resend" };
    }

    const sentViaSmtp = await sendViaSmtp(email, code);
    if (sentViaSmtp) {
      return { delivered: true, via: "smtp" };
    }
  } catch (err) {
    console.error("OTP EMAIL SEND ERROR:", err);
    console.log(`[OTP fallback] ${email} -> ${code} (valid 10 minutes)`);
    return { delivered: false, error: err.message };
  }

  if (!loggedMissingConfig) {
    console.warn("No email provider configured (RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS) — OTP codes will be logged to the server console instead of emailed.");
    loggedMissingConfig = true;
  }
  console.log(`[OTP] ${email} -> ${code} (valid 10 minutes)`);
  return { delivered: false };
}

module.exports = { sendOtpEmail };
