const crypto = require('crypto');
const { sql, pool, poolConnect } = require('../Config/db');

const TOKEN_EXPIRY_DAYS = 7;

// Called when user clicks "Start Verification" on the Vendor Upload page
async function startVerification(req, res) {
  try {
    // const pool = await getPool();
    await poolConnect;

    // 1. Find vendors whose primary email has no active verification request yet
    //    ("active" = already sent / opened / confirmed / updated -> don't re-send)
    const pendingVendorsResult = await pool.request().query(`
      SELECT v.Id AS VendorId, ve.EmailId, ve.Email
      FROM Vendor v
      INNER JOIN VendorEmail ve ON ve.VendorId = v.Id AND ve.IsPrimary = 1
      WHERE NOT EXISTS (
        SELECT 1 FROM VerificationRequests vr
        WHERE vr.EmailId = ve.EmailId
          AND vr.Status IN ('sent', 'opened', 'confirmed', 'updated')
      )
    `);

    const vendors = pendingVendorsResult.recordset;

    if (vendors.length === 0) {
      return res.status(200).json({ message: 'No pending vendors to send.', count: 0 });
    }

    const created = [];

    // 2. Create a verification request (token + expiry) for each pending vendor
    for (const vendor of vendors) {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

      await pool.request()
        .input('EmailId', sql.Int, vendor.EmailId)
        .input('Token', sql.NVarChar(255), token)
        .input('ExpiresAt', sql.DateTime, expiresAt)
        .query(`
          INSERT INTO VerificationRequests (EmailId, Token, Status, SentAt, ExpiresAt)
          VALUES (@EmailId, @Token, 'sent', GETDATE(), @ExpiresAt)
        `);

      created.push({ vendorId: vendor.VendorId, email: vendor.Email, token });

      // TODO (later, once email setup is built):
      // await sendVerificationEmail(vendor.Email, token);
    }

    return res.status(200).json({
      message: `Verification requests created for ${created.length} vendor(s).`,
      data: created
    });

  } catch (err) {
    console.error('startVerification error:', err);
    return res.status(500).json({ error: 'Failed to start verification.' });
  }
}

module.exports = { startVerification };