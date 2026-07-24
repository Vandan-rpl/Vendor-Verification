const { sql, pool, poolConnect } = require("../Config/db");
const vendorUploadModel = require("../Models/vendorUploadModel");
const { parseExcelBuffer, mapRow } = require("./excelParserService");

/**
 * Full workflow: parse file -> open transaction -> insert batch,
 * then per row insert vendor + emails -> update batch counts -> commit.
 * Rolls back everything on unexpected failure.
 */
const processVendorExcel = async ({ fileBuffer, fileName, uploadedBy }) => {
  let rawRows = [];

  try {
    rawRows = parseExcelBuffer(fileBuffer);
  } catch (parseErr) {
    const err = new Error(`Unable to read Excel file: ${parseErr.message}`);
    err.statusCode = 400;
    throw err;
  }

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
      let mappedRow;

      try {
        mappedRow = mapRow(rawRows[i]);
      } catch (mapErr) {
        failedCount++;
        failedRows.push({ row: rowNumber, reason: `Row mapping failed: ${mapErr.message}` });
        continue;
      }

      const { vendorFields, emails } = mappedRow;

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

        // Only keep emails that actually have a value, preserving original order
        const validEmails = emails.filter(({ email }) => !!email);

        for (let idx = 0; idx < validEmails.length; idx++) {
          const { email } = validEmails[idx];
          const isPrimary = idx === 0; // first valid email in the row becomes primary
          await vendorUploadModel.insertVendorEmail(transaction, vendorId, email, isPrimary);
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