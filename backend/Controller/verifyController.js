const { sql, pool, poolConnect } = require('../Config/db');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BASE_UPLOAD_PATH = process.env.UPLOAD_BASE_PATH;

// Document types the vendor can submit. GST is mandatory only when the
// vendor changes their address, and MSME becomes mandatory only when the
// vendor checks "Registered as MSME" (see getMissingRequiredDocuments).
// Keep this in sync with DOCUMENT_SLOTS on the frontend.
const REQUIRED_DOCUMENT_TYPES = [];
const ALL_DOCUMENT_TYPES = ['GST', 'Aadhar', 'Invoice', 'MSME'];

const MSME_CATEGORIES = ['Micro', 'Small', 'Medium'];
const MSME_TYPES = ['Trading', 'Manufacturing', 'Service'];

function sanitizeVendorCode(code) {
  if (code === undefined || code === null) {
    throw new Error('VendorCode is missing — cannot create upload folder.');
  }
  return String(code).replace(/[^a-zA-Z0-9_-]/g, '');
}

// req.files here is the OBJECT shape produced by multer.fields(), e.g.
// { GST: [file], Aadhar: [file], Invoice: [file] } — not the flat array
// you get from multer.array(). Missing types simply won't be keys on it.
//
// isMSME toggles whether the MSME slot is added to the required list on
// top of the always-required types.
function getMissingRequiredDocuments(filesByType, isMSME, addressChanged) {
  const requiredTypes = [
    ...(isMSME ? ['MSME'] : []),
    ...(addressChanged ? ['GST'] : [])
  ];

  return requiredTypes.filter(
    (type) => !filesByType || !filesByType[type] || !filesByType[type][0]
  );
}

// Normalizes the isMSME value coming from multipart form-data (always a
// string) or JSON (could be boolean) into a real boolean.
function parseIsMSME(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

// Validates category/type only when isMSME is true. Returns an error
// string, or null if valid.
function validateMSMEFields(isMSME, msmeCategory, msmeType) {
  if (!isMSME) return null;

  if (!msmeCategory || !MSME_CATEGORIES.includes(msmeCategory)) {
    return 'Please select a valid MSME category.';
  }
  if (!msmeType || !MSME_TYPES.includes(msmeType)) {
    return 'Please select a valid MSME type.';
  }
  return null;
}

async function saveVendorVerificationResponse({
  requestId,
  vendorId,
  vendorName,
  contactNumber,
  email,
  address,
  isMSME = false,
  msmeCategory = null,
  msmeType = null
}) {
  const result = await pool.request()
    .input('RequestId', sql.Int, requestId)
    .input('VendorId', sql.Int, vendorId)
    .input('VendorName', sql.NVarChar(200), vendorName)
    .input('ContactNumber', sql.NVarChar(20), contactNumber)
    .input('Email', sql.NVarChar(200), email)
    .input('Address', sql.NVarChar(500), address)
    .input('IsMSME', sql.Bit, isMSME)
    .input('MSMECategory', sql.NVarChar(20), isMSME ? msmeCategory : null)
    .input('MSMEType', sql.NVarChar(20), isMSME ? msmeType : null)
    .query(`
      INSERT INTO VendorVerificationResponse
        (RequestId, VendorId, VendorName, ContactNumber, Email, Address, IsMSME, MSMECategory, MSMEType)
      OUTPUT INSERTED.Id
      VALUES
        (@RequestId, @VendorId, @VendorName, @ContactNumber, @Email, @Address, @IsMSME, @MSMECategory, @MSMEType)
    `);

  return result.recordset[0].Id;
}

// filesByType: multer.fields() object, e.g. { GST: [file], Aadhar: [file], Invoice: [file] }
async function saveVendorDocuments({ responseId, vendorCode, filesByType }) {
  if (!filesByType) return [];

  const safeVendorCode = sanitizeVendorCode(vendorCode);
  const vendorFolder = path.join(BASE_UPLOAD_PATH, safeVendorCode);

  if (!fs.existsSync(vendorFolder)) {
    fs.mkdirSync(vendorFolder, { recursive: true });
  }

  const saved = [];

  for (const documentType of ALL_DOCUMENT_TYPES) {
    const file = filesByType[documentType] && filesByType[documentType][0];
    if (!file) continue;

    const ext = path.extname(file.originalname);
    const storedFileName = `${uuidv4()}${ext}`;
    const destPath = path.join(vendorFolder, storedFileName);

    fs.renameSync(file.path, destPath);

    const relativeFilePath = `${safeVendorCode}/${storedFileName}`;

    await pool.request()
      .input('ResponseId', sql.Int, responseId)
      .input('OriginalFileName', sql.NVarChar(255), file.originalname)
      .input('StoredFileName', sql.NVarChar(255), storedFileName)
      .input('FilePath', sql.NVarChar(500), relativeFilePath)
      .input('MimeType', sql.NVarChar(100), file.mimetype)
      .input('FileSize', sql.BigInt, file.size)
      .input('DocumentType', sql.NVarChar(100), documentType)
      .query(`
        INSERT INTO VendorDocuments
          (ResponseId, OriginalFileName, StoredFileName, FilePath, MimeType, FileSize, DocumentType)
        VALUES
          (@ResponseId, @OriginalFileName, @StoredFileName, @FilePath, @MimeType, @FileSize, @DocumentType)
      `);

    saved.push({ originalFileName: file.originalname, documentType });
  }

  return saved;
}

// GET /api/verify/:token
// Loads vendor's current details for the confirm/edit page, and marks the link as opened
async function getVerificationDetails(req, res) {
  const { token } = req.params;
  try {
    await poolConnect;

    const result = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        SELECT vr.RequestId, vr.Status, vr.ExpiresAt,
               v.VendorId AS VendorId,
               v.VendorName AS Name,
               v.MobileNumber AS MobileNumber,
               CONCAT(
                 v.AddressLine1,
                 CASE WHEN v.AddressLine2 IS NOT NULL AND v.AddressLine2 <> '' THEN CONCAT(', ', v.AddressLine2) ELSE '' END,
                 CASE WHEN v.City IS NOT NULL AND v.City <> '' THEN CONCAT(', ', v.City) ELSE '' END,
                 CASE WHEN v.State IS NOT NULL AND v.State <> '' THEN CONCAT(', ', v.State) ELSE '' END,
                 CASE WHEN v.Pincode IS NOT NULL AND v.Pincode <> '' THEN CONCAT(' - ', v.Pincode) ELSE '' END
               ) AS Address,
               ve.Email
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE vr.Token = @Token
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }

    const record = result.recordset[0];

    // Expired check
    if (new Date() > new Date(record.ExpiresAt) && !['confirmed', 'updated'].includes(record.Status)) {
      await pool.request()
        .input('Token', sql.NVarChar(255), token)
        .query(`UPDATE VerificationRequests SET Status = 'expired' WHERE Token = @Token`);
      return res.status(410).json({ error: 'This verification link has expired.' });
    }

    // Already responded — show a read-only "already done" state
    if (['confirmed', 'updated'].includes(record.Status)) {
      return res.status(200).json({
        alreadyResponded: true,
        status: record.Status,
        vendor: {
          name: record.Name,
          mobileNumber: record.MobileNumber,
          email: record.Email,
          address: record.Address
        }
      });
    }

    // Mark as opened (only flips 'sent' -> 'opened'; leaves OpenedAt untouched after first visit)
    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = CASE WHEN Status = 'sent' THEN 'opened' ELSE Status END,
            OpenedAt = CASE WHEN OpenedAt IS NULL THEN GETDATE() ELSE OpenedAt END,
            OpenCount = OpenCount + 1
        WHERE Token = @Token
      `);

    return res.status(200).json({
      alreadyResponded: false,
      vendor: {
        name: record.Name,
        mobileNumber: record.MobileNumber,
        email: record.Email,
        address: record.Address
      }
    });

  } catch (err) {
    console.error('getVerificationDetails error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// POST /api/verify/:token/confirm
// Vendor says "all details are correct" — no data change, just marks confirmed.
// Documents are NOT required here — GST/Aadhar/MSME are only mandatory on the
// update/edit path (submitUpdate), where the vendor is changing details.
// MSME status is not applicable on this path since the vendor isn't asserting
// or changing anything — IsMSME stays at its DB default (0).
async function confirmVerification(req, res) {
  const { token } = req.params;
  try {
    await poolConnect;

    const check = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        SELECT vr.RequestId, vr.Status, vr.ExpiresAt,
               ve.VendorId, v.VendorName, v.MobileNumber, v.VendorCode, ve.Email,
               CONCAT(
                 v.AddressLine1,
                 CASE WHEN v.AddressLine2 IS NOT NULL AND v.AddressLine2 <> '' THEN CONCAT(', ', v.AddressLine2) ELSE '' END,
                 CASE WHEN v.City IS NOT NULL AND v.City <> '' THEN CONCAT(', ', v.City) ELSE '' END,
                 CASE WHEN v.State IS NOT NULL AND v.State <> '' THEN CONCAT(', ', v.State) ELSE '' END,
                 CASE WHEN v.Pincode IS NOT NULL AND v.Pincode <> '' THEN CONCAT(' - ', v.Pincode) ELSE '' END
               ) AS Address
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE vr.Token = @Token
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }
    const record = check.recordset[0];
    if (['confirmed', 'updated', 'expired'].includes(record.Status) || new Date() > new Date(record.ExpiresAt)) {
      return res.status(400).json({ error: 'This link is no longer active.' });
    }

    const responseId = await saveVendorVerificationResponse({
      requestId: record.RequestId,
      vendorId: record.VendorId,
      vendorName: record.VendorName,
      contactNumber: record.MobileNumber,
      email: record.Email,
      address: record.Address
    });

    await saveVendorDocuments({
      responseId,
      vendorCode: record.VendorCode,
      filesByType: req.files
    });

    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = 'confirmed', VerifiedAt = GETDATE()
        WHERE Token = @Token
      `);

    return res.status(200).json({ message: 'Thank you. Your details have been confirmed.' });

  } catch (err) {
    console.error('confirmVerification error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// POST /api/verify/:token/update
// Vendor submits edited details — stored in VendorVerificationResponse for review,
// does NOT touch the live Vendor table.
// GST is required only when the vendor changes their address, and MSME is
// required only when the user checks the MSME box.
async function submitUpdate(req, res) {
  const { token } = req.params;
  const { name, mobileNumber, email, address, isMSME, msmeCategory, msmeType } = req.body;

  if (!name || !mobileNumber || !email || !address) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const isMSMEBool = parseIsMSME(isMSME);

  const msmeError = validateMSMEFields(isMSMEBool, msmeCategory, msmeType);
  if (msmeError) {
    return res.status(400).json({ error: msmeError });
  }

  try {
    await poolConnect;

    const check = await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        SELECT vr.RequestId, vr.Status, vr.ExpiresAt, v.VendorCode, ve.VendorId,
               CONCAT(
                 v.AddressLine1,
                 CASE WHEN v.AddressLine2 IS NOT NULL AND v.AddressLine2 <> '' THEN CONCAT(', ', v.AddressLine2) ELSE '' END,
                 CASE WHEN v.City IS NOT NULL AND v.City <> '' THEN CONCAT(', ', v.City) ELSE '' END,
                 CASE WHEN v.State IS NOT NULL AND v.State <> '' THEN CONCAT(', ', v.State) ELSE '' END,
                 CASE WHEN v.Pincode IS NOT NULL AND v.Pincode <> '' THEN CONCAT(' - ', v.Pincode) ELSE '' END
               ) AS Address
        FROM VerificationRequests vr
        INNER JOIN VendorEmail ve ON ve.EmailId = vr.EmailId
        INNER JOIN Vendor v ON v.VendorId = ve.VendorId
        WHERE vr.Token = @Token
      `);

    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Invalid verification link.' });
    }
    const record = check.recordset[0];
    if (['confirmed', 'updated', 'expired'].includes(record.Status) || new Date() > new Date(record.ExpiresAt)) {
      return res.status(400).json({ error: 'This link is no longer active.' });
    }

    const currentAddress = (record.Address || '').trim();
    const submittedAddress = (address || '').trim();
    const addressChanged = currentAddress !== submittedAddress;

    const missingDocs = getMissingRequiredDocuments(req.files, isMSMEBool, addressChanged);
    if (missingDocs.length) {
      return res.status(400).json({ error: `Please attach: ${missingDocs.join(', ')} before submitting.` });
    }

    const responseId = await saveVendorVerificationResponse({
      requestId: record.RequestId,
      vendorId: record.VendorId,
      vendorName: name,
      contactNumber: mobileNumber,
      email,
      address,
      isMSME: isMSMEBool,
      msmeCategory,
      msmeType
    });

    await saveVendorDocuments({
      responseId,
      vendorCode: record.VendorCode,
      filesByType: req.files
    });

    await pool.request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE VerificationRequests
        SET Status = 'updated', VerifiedAt = GETDATE()
        WHERE Token = @Token
      `);

    return res.status(200).json({ message: 'Thank you. Your updated details have been submitted for review.' });

  } catch (err) {
    console.error('submitUpdate error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getVerificationDetails, confirmVerification, submitUpdate };