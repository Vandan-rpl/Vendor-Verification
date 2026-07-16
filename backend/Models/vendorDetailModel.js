const { sql, pool,poolConnect } = require("../config/db");

const getVendorById = async (vendorId) => {
//const pool = await getPool();
await poolConnect;
  const result = await new sql.Request(pool)
    .input("VendorId", sql.Int, vendorId)
    .query(`
      SELECT VendorId, VendorCode, VendorName, AddressLine1, AddressLine2,
             City, State, Pincode, Status, CreatedAt, UpdatedAt
      FROM Vendor
      WHERE VendorId = @VendorId
    `);
  return result.recordset[0] || null;
};

const getVendorEmailsWithRequests = async (vendorId) => {
//   const pool = await getPool();
  await poolConnect;
  const result = await new sql.Request(pool)
    .input("VendorId", sql.Int, vendorId)
    .query(`
      SELECT
        ve.EmailId,
        ve.Email,
        ve.IsActive,
        vr.RequestId,
        vr.Status AS RequestStatus,
        vr.SentAt,
        vr.ExpiresAt,
        vr.VerifiedAt
      FROM VendorEmail ve
      LEFT JOIN VerificationRequests vr ON vr.EmailId = ve.EmailId
      WHERE ve.VendorId = @VendorId
      ORDER BY ve.EmailId, vr.SentAt DESC
    `);
  return result.recordset;
};

module.exports = { getVendorById, getVendorEmailsWithRequests };