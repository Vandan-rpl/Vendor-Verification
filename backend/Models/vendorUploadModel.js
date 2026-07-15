const { sql } = require("../Config/db");

/**
 * All functions accept a `transaction` (or pool) object so the service layer
 * controls commit/rollback across all three tables as one unit.
 */

// --- ExcelUpload ---

const createBatch = async (transaction, { fileName, uploadedBy, totalRows }) => {
  const result = await new sql.Request(transaction)
    .input("FileName", sql.NVarChar, fileName)
    .input("UploadedBy", sql.Int, uploadedBy)
    .input("TotalRows", sql.Int, totalRows)
    .input("SuccessRows", sql.Int, 0)
    .input("FailedRows", sql.Int, 0)
    .query(`
      INSERT INTO ExcelUpload (FileName, UploadedBy, TotalRows, SuccessRows, FailedRows)
      OUTPUT INSERTED.BatchId
      VALUES (@FileName, @UploadedBy, @TotalRows, @SuccessRows, @FailedRows)
    `);
  return result.recordset[0].BatchId;
};

const updateBatchCounts = async (
  transaction,
  { batchId, successCount, failedCount }
) => {
  await new sql.Request(transaction)
    .input("BatchId", sql.Int, batchId)
    .input("SuccessRows", sql.Int, successCount)
    .input("FailedRows", sql.Int, failedCount)
    .query(`
      UPDATE ExcelUpload
      SET
        SuccessRows = @SuccessRows,
        FailedRows = @FailedRows
      WHERE BatchId = @BatchId
    `);
};

// --- Vendor ---

const insertVendor = async (transaction, batchId, vendorFields) => {
  const result = await new sql.Request(transaction)
    .input("BatchId", sql.Int, batchId)
    .input("VendorCode", sql.Int, vendorFields.VendorCode)
    .input("VendorName", sql.NVarChar, vendorFields.VendorName)
    .input("AddressLine1", sql.NVarChar, vendorFields.AddressLine1 || null)
    .input("AddressLine2", sql.NVarChar, vendorFields.AddressLine2 || null)
    .input("City", sql.NVarChar, vendorFields.City || null)
    .input("State", sql.NVarChar, vendorFields.State || null)
    .input("Pincode", sql.NVarChar, vendorFields.Pincode || null)
    .input("Status", sql.NVarChar, "pending")
    .query(`
      INSERT INTO Vendor (
        BatchId, VendorCode, VendorName, AddressLine1, AddressLine2, City, State,
        Pincode, Status
      )
      OUTPUT INSERTED.VendorId
      VALUES (
        @BatchId, @VendorCode, @VendorName, @AddressLine1, @AddressLine2, @City, @State,
        @Pincode, @Status
      )
    `);
  return result.recordset[0].VendorId;
};

// --- VendorEmail ---

const insertVendorEmail = async (transaction, vendorId, email) => {
  await new sql.Request(transaction)
    .input("VendorId", sql.Int, vendorId)
    .input("Email", sql.NVarChar(150), email)
    .input("IsActive", sql.Bit, true)
    .query(`
      INSERT INTO VendorEmail (
        VendorId,
        Email,
        IsActive,
        CreatedAt
      )
      VALUES (
        @VendorId,
        @Email,
        @IsActive,
        GETDATE()
      )
    `);
};

module.exports = {
  createBatch,
  updateBatchCounts,
  insertVendor,
  insertVendorEmail,
};