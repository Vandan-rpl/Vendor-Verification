const { sql, pool, poolConnect } = require("../config/db");

/**
 * Returns paginated vendors with a computed status derived from their
 * VerificationRequests (not a static Vendor.Status column, which is
 * never updated by the verification flow):
 *
 *   verified -> at least one email Confirmed or Updated
 *   rejected -> all requests Expired, none still Sent/Opened
 *   pending  -> anything else (Sent/Opened, or no request created yet)
 *
 * Filters: status, batchId, search (matches VendorName or VendorCode)
 */
const getVendors = async ({ status, batchId, search, page, limit }) => {
  await poolConnect;
  const offset = (page - 1) * limit;

  const baseCTE = `
    WITH VendorStats AS (
      SELECT
        v.VendorId,
        v.VendorCode,
        v.VendorName,
        v.City,
        v.State,
        v.CreatedAt,
        v.BatchId,
        (SELECT COUNT(*) FROM VendorEmail ve WHERE ve.VendorId = v.VendorId) AS TotalEmails,
        (
          SELECT COUNT(*) FROM VerificationRequests vr
          INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
          WHERE ve.VendorId = v.VendorId AND vr.Status IN ('confirmed', 'updated')
        ) AS VerifiedEmails,
        (
          SELECT MAX(vr.VerifiedAt) FROM VerificationRequests vr
          INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
          WHERE ve.VendorId = v.VendorId
        ) AS LastVerifiedAt,
        (
          SELECT COUNT(*) FROM VerificationRequests vr
          INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
          WHERE ve.VendorId = v.VendorId AND vr.Status IN ('sent', 'opened')
        ) AS PendingCount,
        (
          SELECT COUNT(*) FROM VerificationRequests vr
          INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
          WHERE ve.VendorId = v.VendorId AND vr.Status = 'expired'
        ) AS ExpiredCount
      FROM Vendor v
    ),
    VendorComputed AS (
      SELECT *,
        CASE
          WHEN VerifiedEmails > 0 THEN 'verified'
          WHEN ExpiredCount > 0 AND PendingCount = 0 THEN 'rejected'
          ELSE 'pending'
        END AS ComputedStatus
      FROM VendorStats
    )
  `;

  const dataRequest = new sql.Request(pool)
    .input("Status", sql.NVarChar, status || null)
    .input("BatchId", sql.Int, batchId || null)
    .input("Search", sql.NVarChar, search ? `%${search}%` : null)
    .input("Offset", sql.Int, offset)
    .input("Limit", sql.Int, limit);

  const dataResult = await dataRequest.query(`
    ${baseCTE}
    SELECT
      VendorId, VendorCode, VendorName, City, State, CreatedAt,
      ComputedStatus AS Status,
      TotalEmails, VerifiedEmails, LastVerifiedAt
    FROM VendorComputed
    WHERE
      (@Status IS NULL OR ComputedStatus = @Status)
      AND (@BatchId IS NULL OR BatchId = @BatchId)
      AND (@Search IS NULL OR VendorName LIKE @Search OR CAST(VendorCode AS NVARCHAR(20)) LIKE @Search)
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
  `);

  const countResult = await new sql.Request(pool)
    .input("Status", sql.NVarChar, status || null)
    .input("BatchId", sql.Int, batchId || null)
    .input("Search", sql.NVarChar, search ? `%${search}%` : null)
    .query(`
      ${baseCTE}
      SELECT COUNT(*) AS TotalCount
      FROM VendorComputed
      WHERE
        (@Status IS NULL OR ComputedStatus = @Status)
        AND (@BatchId IS NULL OR BatchId = @BatchId)
        AND (@Search IS NULL OR VendorName LIKE @Search OR CAST(VendorCode AS NVARCHAR(20)) LIKE @Search)
    `);

  return {
    vendors: dataResult.recordset,
    totalCount: countResult.recordset[0].TotalCount,
  };
};

module.exports = { getVendors };