const crypto = require('crypto');
const { sql, pool, poolConnect } = require('../Config/db');
const { sendMail, buildVerificationEmail, buildReminderEmail } = require('./mailer');
const { processQueue } = require('../emailQueue');

const TOKEN_EXPIRY_DAYS = 7;
const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

const REMINDER_AFTER_DAYS = 3;
const MAX_REMINDERS = 2;

// 1. Find vendors still 'pending', create their VerificationRequests rows
//    immediately (so they're never picked up twice), then dispatch the
//    actual emails in the background using the rate-limited queue.
async function processNewVerifications() {
  await poolConnect;

  const pendingVendorsResult = await pool.request().query(`
    SELECT v.VendorId, v.VendorName, ve.EmailId, ve.Email
    FROM Vendor v
    INNER JOIN VendorEmail ve ON ve.VendorId = v.VendorId AND ve.is_primary = 0
    WHERE v.Status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM VerificationRequests vr
        WHERE vr.EmailId = ve.EmailId
          AND vr.Status IN ('queued', 'sent', 'opened', 'confirmed', 'updated')
      )
  `);

  const vendors = pendingVendorsResult.recordset;

  if (vendors.length === 0) {
    return { queued: 0, vendors: [] };
  }

  const queuedVendors = [];

  // Step 1: create DB rows in a queued state first. The request only flips to
  // 'sent' after the mail send succeeds; if the send fails, it stays 'queued'
  // or is marked 'failed'. This prevents false-positive sent counts.
  for (const vendor of vendors) {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    const insertResult = await pool.request()
      .input('EmailId', sql.Int, vendor.EmailId)
      .input('Token', sql.NVarChar(255), token)
      .input('ExpiresAt', sql.DateTime, expiresAt)
      .query(`
        INSERT INTO VerificationRequests (EmailId, Token, Status, SentAt, ExpiresAt)
        OUTPUT INSERTED.RequestId
        VALUES (@EmailId, @Token, 'queued', NULL, @ExpiresAt)
      `);

    const requestId = insertResult.recordset[0]?.RequestId;

    queuedVendors.push({
      ...vendor,
      token,
      requestId,
      link: `${BASE_URL}/verify/${token}`
    });
  }

  // Step 2: dispatch emails in the background, respecting rate limits.
  // Not awaited here on purpose — this can take hours for large batches,
  // and the caller (HTTP request or cron tick) shouldn't be blocked on it.
  processQueue(
    queuedVendors,
    async (vendor) => {
      try {
        await sendMail(vendor.Email, buildVerificationEmail(vendor.VendorName, vendor.link));

        await pool.request()
          .input('RequestId', sql.Int, vendor.requestId)
          .query(`
            UPDATE VerificationRequests
            SET Status = 'sent', SentAt = GETDATE()
            WHERE RequestId = @RequestId AND Status = 'queued'
          `);

        await pool.request()
          .input('VendorId', sql.Int, vendor.VendorId)
          .query(`
            UPDATE Vendor
            SET Status = 'sent'
            WHERE VendorId = @VendorId AND Status = 'pending'
          `);

        console.log(`Mail sent to ${vendor.Email}`);
      } catch (err) {
        await pool.request()
          .input('RequestId', sql.Int, vendor.requestId)
          .query(`
            UPDATE VerificationRequests
            SET Status = 'failed'
            WHERE RequestId = @RequestId AND Status = 'queued'
          `);

        throw err;
      }
    },
    'verification emails'
  ).catch((err) => console.error('[processNewVerifications] queue error:', err));

  return {
    queued: queuedVendors.length,
    vendors: queuedVendors.map((v) => ({ vendorId: v.VendorId, email: v.Email, token: v.token }))
  };
}

// 2. Send reminders to vendors stuck in 'sent'/'opened' (VerificationRequests) past REMINDER_AFTER_DAYS
//    Same rate-limited approach, since this could also be a large batch.
async function processReminders() {
  await poolConnect;

  const staleResult = await pool.request()
    .input('ReminderAfterDays', sql.Int, REMINDER_AFTER_DAYS)
    .input('MaxReminders', sql.Int, MAX_REMINDERS)
    .query(`
      SELECT vr.RequestId, vr.Token, v.VendorName, ve.Email
      FROM VerificationRequests vr
      INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
      INNER JOIN Vendor v ON v.VendorId = ve.VendorId
      WHERE vr.Status IN ('sent', 'opened')
        AND vr.ExpiresAt > GETDATE()
        AND vr.ReminderCount < @MaxReminders
        AND (
          (vr.LastReminderSentAt IS NULL AND vr.SentAt <= DATEADD(DAY, -@ReminderAfterDays, GETDATE()))
          OR
          (vr.LastReminderSentAt IS NOT NULL AND vr.LastReminderSentAt <= DATEADD(DAY, -@ReminderAfterDays, GETDATE()))
        )
    `);

  const staleRequests = staleResult.recordset;

  if (staleRequests.length === 0) {
    return { queued: 0 };
  }

  processQueue(
    staleRequests,
    async (req) => {
      const link = `${BASE_URL}/verify/${req.Token}`;
      await sendMail(req.Email, buildReminderEmail(req.VendorName, link));

      await pool.request()
        .input('RequestId', sql.Int, req.RequestId)
        .query(`
          UPDATE VerificationRequests
          SET ReminderCount = ReminderCount + 1,
              LastReminderSentAt = GETDATE()
          WHERE RequestId = @RequestId
        `);

      console.log(`Reminder sent to ${req.Email}`);
    },
    'reminder emails'
  ).catch((err) => console.error('[processReminders] queue error:', err));

  return { queued: staleRequests.length };
}

// 3. Mark requests as expired once past their ExpiresAt with no response
async function processExpirations() {
  await poolConnect;

  await pool.request().query(`
    UPDATE VerificationRequests
    SET Status = 'expired'
    WHERE Status IN ('sent', 'opened')
      AND ExpiresAt <= GETDATE()
  `);
}

module.exports = { processNewVerifications, processReminders, processExpirations };