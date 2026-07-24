const nodemailer = require("nodemailer");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

// Configure via .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  requireTLS: true,
  family: 4,
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
    console.error("SMTP Verification Failed");
    console.error(error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

function buildVerificationEmail(vendorName, link) {
  return {
    subject: "Action Required: Verify Your Vendor Information",

    html: `
      <p>Dear ${vendorName},</p>

      <p>
        Rubamin Pvt. Ltd. is updating its vendor records and requests you to
        verify your information.
      </p>

      <p>Please review and confirm your details using the button below:</p>

      <p>
        If your information is correct, simply submit the confirmation. If any
        details have changed, you can update them before submitting.
      </p>

      <p style="margin: 30px 0;">
        <a href="${link}"
           style="
              background-color:#0d6efd;
              color:#ffffff;
              padding:12px 24px;
              text-decoration:none;
              border-radius:4px;
              font-weight:bold;
              display:inline-block;">
          Verify Now
        </a>
      </p>

      <p>This verification link will expire in <strong>7 days</strong>.</p>

      <p>If you have any questions, please contact us.</p>

      <p>
        Thank you.<br><br>
        Regards,<br>
        <strong>Rubamin Pvt. Ltd.</strong>
      </p>
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
    console.log("From    : Rubamin Pvt. Ltd. ",process.env.FROM_USER)
    console.log("To      :", to);
    console.log("Subject :", subject);
    console.log("Link    :", linkMatch ? linkMatch[1] : "(not found)");
    console.log("--------------------------------------------------");

    return { dryRun: true };
  }

  return transporter.sendMail({
    from: `"Rubamin Pvt. Ltd."`,
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