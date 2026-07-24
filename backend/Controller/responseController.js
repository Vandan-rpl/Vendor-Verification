const { sql, pool, poolConnect } = require('../Config/db');

// GET /api/verification/responses?status=&search=
// Lists every verification request with vendor info and current status
async function getResponses(req, res) {
  const { status, search } = req.query;

  try {
    await poolConnect;
    const request = pool.request();

    let query = `
      SELECT
        vr.RequestId,
        v.VendorId,
        v.VendorName,
        ve.Email,
        vr.Status,
        vr.SentAt,
        vr.OpenedAt,
        vr.VerifiedAt AS RespondedAt,
        vr.ReminderCount
      FROM VerificationRequests vr
      INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
      INNER JOIN Vendor v ON v.VendorId = ve.VendorId
      WHERE 1 = 1
    `;

    if (status) {
      query += ` AND vr.Status = @Status`;
      request.input('Status', sql.NVarChar(30), status);
    }

    if (search) {
      query += ` AND v.VendorName LIKE @Search`;
      request.input('Search', sql.NVarChar(200), `%${search}%`);
    }

    query += ` ORDER BY vr.SentAt DESC`;

    const result = await request.query(query);

    return res.status(200).json({ data: result.recordset });

  } catch (err) {
    console.error('getResponses error:', err);
    return res.status(500).json({ error: 'Failed to fetch responses.' });
  }
}

// GET /api/verification/responses/:requestId/changes
// Returns the original vendor data side-by-side with what the vendor submitted (for Updated status)
async function getResponseChanges(req, res) {
  const { requestId } = req.params;

  try {
    await poolConnect;

    const vendorResult = await pool.request()
      .input('RequestId', sql.Int, requestId)
      .query(`
        SELECT v.VendorName, v.MobileNumber, CONCAT(
          v.AddressLine1,
          CASE WHEN v.AddressLine2 IS NOT NULL AND v.AddressLine2 <> '' THEN CONCAT(', ', v.AddressLine2) ELSE '' END,
          CASE WHEN v.City IS NOT NULL AND v.City <> '' THEN CONCAT(', ', v.City) ELSE '' END,
          CASE WHEN v.State IS NOT NULL AND v.State <> '' THEN CONCAT(', ', v.State) ELSE '' END,
          CASE WHEN v.Pincode IS NOT NULL AND v.Pincode <> '' THEN CONCAT(' - ', v.Pincode) ELSE '' END
        ) AS Address, ve.Email
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE vr.RequestId = @RequestId
      `);

    if (vendorResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const submittedResult = await pool.request()
      .input('RequestId', sql.Int, requestId)
      .query(`
        SELECT TOP 1 VendorName, ContactNumber, Email, Address, SubmittedAt
        FROM VendorVerificationResponse
        WHERE RequestId = @RequestId
        ORDER BY SubmittedAt DESC
      `);

    if (submittedResult.recordset.length === 0) {
      return res.status(404).json({ error: 'No submitted update found for this request.' });
    }

    return res.status(200).json({
      original: vendorResult.recordset[0],
      submitted: submittedResult.recordset[0]
    });

  } catch (err) {
    console.error('getResponseChanges error:', err);
    return res.status(500).json({ error: 'Failed to fetch changes.' });
  }
}

// GET /api/verification/submissions
// Lists everything vendors have submitted via the update form (VendorVerificationResponse table)
async function getSubmissions(req, res) {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT
        vvr.Id,
        vvr.RequestId,
        vvr.VendorId,
        vvr.VendorName,
        vvr.ContactNumber,
        vvr.Email,
        vvr.Address,
        vvr.SubmittedAt,
        vvr.ApprovalStatus
      FROM VendorVerificationResponse vvr
      ORDER BY vvr.SubmittedAt DESC
    `);

    return res.status(200).json({ data: result.recordset });

  } catch (err) {
    console.error('getSubmissions error:', err);
    return res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
}

module.exports = { getResponses, getResponseChanges, getSubmissions };