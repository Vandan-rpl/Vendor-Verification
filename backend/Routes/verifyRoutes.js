const express = require('express');
const router = express.Router();
const { startVerification } = require('../Controller/verificationController');
const {
  getVerificationDetails,
  confirmVerification,
  submitUpdate
} = require('../Controller/verifyController');
const { getResponses, getResponseChanges, getSubmissions } = require('../Controller/responseController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const TEMP_UPLOAD_PATH = path.join(__dirname, '..', '..', 'temp_uploads');

if (!fs.existsSync(TEMP_UPLOAD_PATH)) {
  fs.mkdirSync(TEMP_UPLOAD_PATH, { recursive: true });
}

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB per file
const upload = multer({ dest: TEMP_UPLOAD_PATH, limits: { fileSize: MAX_DOCUMENT_SIZE } });

// Field name = document type. This makes req.files come back as
// { GST: [file], Aadhar: [file], Invoice: [file] } instead of a flat
// array, so saveVendorDocuments knows exactly which type each file is.
const documentUpload = upload.fields([
  { name: 'GST', maxCount: 1 },
  { name: 'Aadhar', maxCount: 1 },
  { name: 'MSME', maxCount: 1 },
  { name: 'Invoice', maxCount: 1 }
]);

// POST /api/verification/start
router.post('/verification/start', startVerification);

// IMPORTANT: these must come BEFORE '/verification/:token' below —
// otherwise Express treats the literal word "responses"/"submissions" as
// a :token value and these routes would never be reached.
router.get('/verification/responses', getResponses);
router.get('/verification/responses/:requestId/changes', getResponseChanges);
router.get('/verification/submissions', getSubmissions);

// Vendor-facing token routes
router.get('/verification/:token', getVerificationDetails);
router.post('/verification/:token/confirm', documentUpload, confirmVerification);
router.post('/verification/:token/update', documentUpload, submitUpdate);

module.exports = router;