const nodemailer = require("nodemailer");

// Configure via .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  console.log("========== SMTP CONFIG ==========");
  console.log("Host    :", process.env.SMTP_HOST);
  console.log("Port    :", process.env.SMTP_PORT);
  console.log("Secure  :", process.env.SMTP_SECURE);
  console.log("User    :", process.env.SMTP_USER);
  console.log("Pass    :", process.env.SMTP_PASS ? "********" : "NOT SET");
  console.log("=================================");

  if (error) {
    console.error("❌ SMTP Verification Failed");
    console.error(error);
  } else {
    console.log("✅ SMTP Server is ready to send emails");
  }
});

function buildVerificationEmail(vendorName, link) {
  return {
    subject: `Action Required: Please Verify Your Vendor Details`,
    html: `
      <p>Dear ${vendorName},</p>
      <p>We're updating our vendor records and need you to confirm your details are correct.</p>
      <p><a href="${link}">Click here to review and confirm your details</a></p>
      <p>If everything looks correct, you can confirm with one click. If anything has changed, you can update it on the same page.</p>
      <p>This link will expire in 7 days.</p>
      <p>Thank you.</p>
    `,
  };
}

function buildReminderEmail(vendorName, link) {
  return {
    subject: `Reminder: Vendor Verification Still Pending`,
    html: `
      <p>Dear ${vendorName},</p>
      <p>This is a reminder that we haven't yet received your response to our vendor verification request.</p>
      <p><a href="${link}">Click here to review and confirm your details</a></p>
      <p>Please complete this at your earliest convenience.</p>
    `,
  };
}

async function sendMail(to, { subject, html }) {
  if (process.env.SEND_EMAILS === "false") {
    const linkMatch = html.match(/href="([^"]+)"/);

    console.log("--------------------------------------------------");
    console.log("[DRY RUN] Email NOT sent (SEND_EMAILS=false)");
    console.log("To      :", to);
    console.log("Subject :", subject);
    console.log("Link    :", linkMatch ? linkMatch[1] : "(not found)");
    console.log("--------------------------------------------------");

    return { dryRun: true };
  }

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
  });
}

module.exports = {
  sendMail,
  buildVerificationEmail,
  buildReminderEmail,
};