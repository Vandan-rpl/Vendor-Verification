const express = require('express');
const router = express.Router();
const { startVerification } = require('../Controller/verificationController');
const {
  getVerificationDetails,
  confirmVerification,
  submitUpdate
} = require('../Controller/verifyController');

// POST /api/verification/start
router.post('/verification/start', startVerification);
router.get('/verification/:token', getVerificationDetails);
router.post('/verification/:token/confirm', confirmVerification);
router.post('/verification/:token/update', submitUpdate);

module.exports = router;