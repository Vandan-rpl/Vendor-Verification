const { sql, pool, poolConnect } = require("../Config/db");
const vendorUploadModel = require("../Models/vendorUploadModel");
const { parseExcelBuffer, mapRow } = require("./excelParserService");

/**
 * Full workflow: parse file -> open transaction -> insert batch,
 * then per row insert vendor + emails -> update batch counts -> commit.
 * Rolls back everything on unexpected failure.
 */
const processVendorExcel = async ({ fileBuffer, fileName, uploadedBy }) => {
  const rawRows = parseExcelBuffer(fileBuffer);

  if (!rawRows.length) {
    const err = new Error("Excel file is empty");
    err.statusCode = 400;
    throw err;
  }

  await poolConnect; // ensure connection pool is ready
  const transaction = new sql.Transaction(pool);

  let successCount = 0;
  let failedCount = 0;
  const failedRows = [];

  try {
    await transaction.begin();

    const batchId = await vendorUploadModel.createBatch(transaction, {
      fileName,
      uploadedBy,
      totalRows: rawRows.length,
    });

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // header row + 1-indexing
      const { vendorFields, emails } = mapRow(rawRows[i]);

      if (!vendorFields.VendorName) {
        failedCount++;
        failedRows.push({ row: rowNumber, reason: "Missing VendorName" });
        continue;
      }

      if (!vendorFields.VendorCode || isNaN(Number(vendorFields.VendorCode))) {
        failedCount++;
        failedRows.push({ row: rowNumber, reason: "Missing or invalid VendorCode" });
        continue;
      }
      vendorFields.VendorCode = Number(vendorFields.VendorCode);

      try {
        const vendorId = await vendorUploadModel.insertVendor(transaction, batchId, vendorFields);

        for (const { email, emailType } of emails) {
          await vendorUploadModel.insertVendorEmail(transaction, vendorId, email, emailType);
        }

        successCount++;
      } catch (rowErr) {
        failedCount++;
        failedRows.push({ row: rowNumber, reason: rowErr.message });
      }
    }

    await vendorUploadModel.updateBatchCounts(transaction, {
      batchId,
      successCount,
      failedCount,
    });

    await transaction.commit();

    return {
      batchId,
      totalRows: rawRows.length,
      successCount,
      failedCount,
      failedRows,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

module.exports = { processVendorExcel };