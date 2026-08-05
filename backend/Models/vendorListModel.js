const { sql, pool, poolConnect } = require("../Config/db");

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

const getUploadBatches = async () => {
  await poolConnect;

  const result = await new sql.Request(pool)
    .query(`
      SELECT
        e.BatchId,
        e.FileName,
        e.TotalRows,
        e.SuccessRows,
        e.FailedRows,
        e.UploadedAt,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM Vendor v
            INNER JOIN VendorEmail ve ON ve.VendorId = v.VendorId
            INNER JOIN VerificationRequests vr ON vr.EmailId = ve.EmailId
            WHERE v.BatchId = e.BatchId
          ) THEN 0
          ELSE 1
        END AS CanDelete
      FROM ExcelUpload e
      ORDER BY e.UploadedAt DESC
    `);

  return result.recordset;
};

const deleteBatch = async (batchId) => {
  await poolConnect;

  const checkResult = await new sql.Request(pool)
    .input("BatchId", sql.Int, batchId)
    .query(`SELECT COUNT(*) AS VendorCount FROM Vendor WHERE BatchId = @BatchId`);

  const vendorCount = checkResult.recordset[0].VendorCount;

  if (vendorCount === 0) {
    const err = new Error(`No vendor batch found with BatchId: ${batchId}`);
    err.statusCode = 404;
    throw err;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`
        DELETE vd
        FROM VendorDocuments vd
        INNER JOIN VendorVerificationResponse vvr ON vvr.Id = vd.ResponseId
        INNER JOIN VerificationRequests vr ON vr.RequestId = vvr.RequestId
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE v.BatchId = @BatchId
      `);

    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`
        DELETE vvr
        FROM VendorVerificationResponse vvr
        INNER JOIN VerificationRequests vr ON vr.RequestId = vvr.RequestId
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE v.BatchId = @BatchId
      `);

    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`
        DELETE vr
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE v.BatchId = @BatchId
      `);

    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`
        DELETE ve
        FROM VendorEmail ve
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE v.BatchId = @BatchId
      `);

    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`DELETE FROM Vendor WHERE BatchId = @BatchId`);

    await new sql.Request(transaction)
      .input("BatchId", sql.Int, batchId)
      .query(`DELETE FROM ExcelUpload WHERE BatchId = @BatchId`);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return { deletedCount: vendorCount };
};

module.exports = { getVendors, getUploadBatches, deleteBatch };