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

const upload = multer({ dest: TEMP_UPLOAD_PATH });

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
router.post('/verification/:token/confirm', upload.array('file', 10), confirmVerification);
router.post('/verification/:token/update', upload.array('file', 10), submitUpdate);

module.exports = router;