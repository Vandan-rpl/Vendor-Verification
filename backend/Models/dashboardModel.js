const { sql, pool, poolConnect } = require("../config/db");

const getSummaryCounts = async () => {
  await poolConnect;

  const result = await new sql.Request(pool).query(`
    SELECT
      (SELECT COUNT(*) FROM Vendor) AS TotalVendors,

      (SELECT COUNT(*) FROM VerificationRequests
       WHERE Status IN ('sent', 'opened')) AS PendingCount,

      (SELECT COUNT(*) FROM VerificationRequests
       WHERE Status IN ('confirmed', 'updated')) AS VerifiedCount,

      (SELECT COUNT(*) FROM VerificationRequests
       WHERE Status = 'expired') AS RejectedCount,

      (SELECT COUNT(*) FROM VerificationRequests
       WHERE CAST(SentAt AS DATE) = CAST(GETDATE() AS DATE)) AS EmailsSentToday
  `);

  return result.recordset[0];
};

module.exports = { getSummaryCounts };