const express = require('express');
const router = express.Router();
const { startVerification } = require('../Controller/verificationController');
const {
  getVerificationDetails,
  confirmVerification,
  submitUpdate
} = require('../Controller/verifyController');
const { getResponses, getResponseChanges } = require('../Controller/responseController');

// POST /api/verification/start
router.post('/verification/start', startVerification);

// IMPORTANT: these two must come BEFORE '/verification/:token' below —
// otherwise Express treats the literal word "responses" as a :token value
// and these routes would never be reached.
router.get('/verification/responses', getResponses);
router.get('/verification/responses/:requestId/changes', getResponseChanges);

// Vendor-facing token routes
router.get('/verification/:token', getVerificationDetails);
router.post('/verification/:token/confirm', confirmVerification);
router.post('/verification/:token/update', submitUpdate);

module.exports = router;