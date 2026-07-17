const { sql, pool, poolConnect } = require('../Config/db');

// GET /api/verify/:token
// Loads vendor's current details for the confirm/edit page, and marks the link as opened
async function getVerificationDetails(req, res) {
  const { token } = req.params;
  try {
    await poolConnect;

    const result = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        SELECT vr.RequestId, vr.Status, vr.ExpiresAt,
               v.VendorId AS VendorId,
               v.VendorName AS Name,
               v.MobileNumber AS MobileNumber,
               CONCAT(
                 v.AddressLine1,
                 CASE WHEN v.AddressLine2 IS NOT NULL AND v.AddressLine2 <> '' THEN CONCAT(', ', v.AddressLine2) ELSE '' END,
                 CASE WHEN v.City IS NOT NULL AND v.City <> '' THEN CONCAT(', ', v.City) ELSE '' END,
                 CASE WHEN v.State IS NOT NULL AND v.State <> '' THEN CONCAT(', ', v.State) ELSE '' END,
                 CASE WHEN v.Pincode IS NOT NULL AND v.Pincode <> '' THEN CONCAT(' - ', v.Pincode) ELSE '' END
               ) AS Address,
               ve.Email
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE vr.Token = @Token
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }

    const record = result.recordset[0];

    // Expired check
    if (new Date() > new Date(record.ExpiresAt) && !['confirmed', 'updated'].includes(record.Status)) {
      await pool.request()
        .input('Token', sql.NVarChar(255), token)
        .query(`UPDATE VerificationRequests SET Status = 'expired' WHERE Token = @Token`);
      return res.status(410).json({ error: 'This verification link has expired.' });
    }

    // Already responded — show a read-only "already done" state
    if (['confirmed', 'updated'].includes(record.Status)) {
      return res.status(200).json({
        alreadyResponded: true,
        status: record.Status,
        vendor: {
          name: record.Name,
          mobileNumber: record.MobileNumber,
          email: record.Email,
          address: record.Address
        }
      });
    }

    // Mark as opened (only flips 'sent' -> 'opened'; leaves OpenedAt untouched after first visit)
    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = CASE WHEN Status = 'sent' THEN 'opened' ELSE Status END,
            OpenedAt = CASE WHEN OpenedAt IS NULL THEN GETDATE() ELSE OpenedAt END,
            OpenCount = OpenCount + 1
        WHERE Token = @Token
      `);

    return res.status(200).json({
      alreadyResponded: false,
      vendor: {
        name: record.Name,
        mobileNumber: record.MobileNumber,
        email: record.Email,
        address: record.Address
      }
    });

  } catch (err) {
    console.error('getVerificationDetails error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// POST /api/verify/:token/confirm
// Vendor says "all details are correct" — no data change, just marks confirmed
async function confirmVerification(req, res) {
  const { token } = req.params;
  try {
    await poolConnect;

    const check = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`SELECT Status, ExpiresAt FROM VerificationRequests WHERE Token = @Token`);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }
    const record = check.recordset[0];
    if (['confirmed', 'updated', 'expired'].includes(record.Status) || new Date() > new Date(record.ExpiresAt)) {
      return res.status(400).json({ error: 'This link is no longer active.' });
    }

    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = 'confirmed', VerifiedAt = GETDATE()
        WHERE Token = @Token
      `);

    return res.status(200).json({ message: 'Thank you. Your details have been confirmed.' });

  } catch (err) {
    console.error('confirmVerification error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// POST /api/verify/:token/update
// Vendor submits edited details — stored in VendorVerificationResponse for review,
// does NOT touch the live Vendor table
async function submitUpdate(req, res) {
  const { token } = req.params;
  const { name, mobileNumber, email, address } = req.body;

  if (!name || !mobileNumber || !email || !address) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    await poolConnect;

    const check = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        SELECT vr.RequestId, vr.Status, vr.ExpiresAt, ve.VendorId
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        WHERE vr.Token = @Token
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }
    const record = check.recordset[0];
    if (['confirmed', 'updated', 'expired'].includes(record.Status) || new Date() > new Date(record.ExpiresAt)) {
      return res.status(400).json({ error: 'This link is no longer active.' });
    }

    await pool.request()
      .input('RequestId', sql.Int, record.RequestId)
      .input('VendorId', sql.Int, record.VendorId)
      .input('VendorName', sql.NVarChar(200), name)
      .input('ContactNumber', sql.NVarChar(20), mobileNumber)
      .input('Email', sql.NVarChar(200), email)
      .input('Address', sql.NVarChar(500), address)
      .query(`
        INSERT INTO VendorVerificationResponse
          (RequestId, VendorId, VendorName, ContactNumber, Email, Address)
        VALUES
          (@RequestId, @VendorId, @VendorName, @ContactNumber, @Email, @Address)
      `);

    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = 'updated', VerifiedAt = GETDATE()
        WHERE Token = @Token
      `);

    return res.status(200).json({ message: 'Thank you. Your updated details have been submitted for review.' });

  } catch (err) {
    console.error('submitUpdate error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getVerificationDetails, confirmVerification, submitUpdate };