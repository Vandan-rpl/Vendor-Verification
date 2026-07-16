const { sql, pool,poolConnect } = require("../config/db");

const getSummaryCounts = async () => {
  await poolConnect;
//   const pool = await getPool();

  const result = await new sql.Request(pool).query(`
    SELECT
      (SELECT COUNT(*) FROM Vendor) AS TotalVendors,
      (SELECT COUNT(*) FROM Vendor WHERE Status = 'pending') AS PendingCount,
      (SELECT COUNT(*) FROM Vendor WHERE Status = 'verified') AS VerifiedCount,
      (SELECT COUNT(*) FROM Vendor WHERE Status = 'rejected') AS RejectedCount,
      (
        SELECT COUNT(*) FROM VerificationRequests
        WHERE CAST(SentAt AS DATE) = CAST(GETDATE() AS DATE)
      ) AS EmailsSentToday
  `);

  return result.recordset[0];
};

module.exports = { getSummaryCounts };