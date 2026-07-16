const { sql, pool,poolConnect } = require("../config/db");

/**
 * Returns paginated vendors with:
 *  - TotalEmails: how many emails exist for this vendor
 *  - VerifiedEmails: how many of those have been verified
 *  - LastVerifiedAt: most recent verification timestamp across all their emails
 *
 * Filters: status, batchId, search (matches VendorName or VendorCode)
 */
const getVendors = async ({ status, batchId, search, page, limit }) => {
    await poolConnect;
//   const pool = await pool();
  const offset = (page - 1) * limit;

  const request = new sql.Request(pool)
    .input("Status", sql.NVarChar, status || null)
    .input("BatchId", sql.Int, batchId || null)
    .input("Search", sql.NVarChar, search ? `%${search}%` : null)
    .input("Offset", sql.Int, offset)
    .input("Limit", sql.Int, limit);

  const dataResult = await request.query(`
    SELECT
      v.VendorId,
      v.VendorCode,
      v.VendorName,
      v.City,
      v.State,
      v.Status,
      v.CreatedAt,
      (
        SELECT COUNT(*) FROM VendorEmail ve
        WHERE ve.VendorId = v.VendorId
      ) AS TotalEmails,
      (
        SELECT COUNT(*) FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        WHERE ve.VendorId = v.VendorId AND vr.Status = 'verified'
      ) AS VerifiedEmails,
      (
        SELECT MAX(vr.VerifiedAt) FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        WHERE ve.VendorId = v.VendorId
      ) AS LastVerifiedAt
    FROM Vendor v
    WHERE
      (@Status IS NULL OR v.Status = @Status)
      AND (@BatchId IS NULL OR v.BatchId = @BatchId)
      AND (@Search IS NULL OR v.VendorName LIKE @Search OR CAST(v.VendorCode AS NVARCHAR(20)) LIKE @Search)
    ORDER BY v.CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
  `);

  const countResult = await new sql.Request(pool)
    .input("Status", sql.NVarChar, status || null)
    .input("BatchId", sql.Int, batchId || null)
    .input("Search", sql.NVarChar, search ? `%${search}%` : null)
    .query(`
      SELECT COUNT(*) AS TotalCount
      FROM Vendor v
      WHERE
        (@Status IS NULL OR v.Status = @Status)
        AND (@BatchId IS NULL OR v.BatchId = @BatchId)
        AND (@Search IS NULL OR v.VendorName LIKE @Search OR CAST(v.VendorCode AS NVARCHAR(20)) LIKE @Search)
    `);

  return {
    vendors: dataResult.recordset,
    totalCount: countResult.recordset[0].TotalCount,
  };
};

module.exports = { getVendors };