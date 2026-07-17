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
        v.Id AS VendorId,
        v.Name AS VendorName,
        ve.Email,
        vr.Status,
        vr.SentAt,
        vr.OpenedAt,
        vr.VerifiedAt AS RespondedAt,
        vr.ReminderCount
      FROM VerificationRequests vr
      INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
      INNER JOIN Vendor v ON v.Id = ve.VendorId
      WHERE 1 = 1
    `;

    if (status) {
      query += ` AND vr.Status = @Status`;
      request.input('Status', sql.NVarChar(30), status);
    }

    if (search) {
      query += ` AND v.Name LIKE @Search`;
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
        SELECT v.Name, v.MobileNumber, v.Address, ve.Email
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.Id = ve.VendorId
        WHERE vr.RequestId = @RequestId
      `);

    if (vendorResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const submittedResult = await pool.request()
      .input('RequestId', sql.Int, requestId)
      .query(`
        SELECT TOP 1 VendorName, ContactNumber, Email, Address, SubmittedAt, ApprovalStatus
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

module.exports = { getResponses, getResponseChanges };