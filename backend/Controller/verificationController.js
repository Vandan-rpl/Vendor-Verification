const { processNewVerifications } = require('../Services/verificationService');

// Called when user clicks "Start Verification" on the Vendor Upload page.
// Responds immediately with how many vendors were queued — actual sending
// happens in the background at a rate-limited pace (see emailQueue.js).
async function startVerification(req, res) {
  try {
    const batchId = req.body?.batchId;
    const parsedBatchId = batchId ? parseInt(batchId, 10) : null;

    if (batchId != null && (Number.isNaN(parsedBatchId) || parsedBatchId <= 0)) {
      return res.status(400).json({ error: 'Invalid batchId provided.' });
    }

    const result = await processNewVerifications(parsedBatchId);

    if (result.queued === 0) {
      return res.status(200).json({ message: 'No pending vendors to send.', count: 0 });
    }

    return res.status(200).json({
      message: `${result.queued} vendor(s) queued for verification emails. Sending in progress.`,
      data: result.vendors,
    });
  } catch (err) {
    console.error('startVerification error:', err);
    return res.status(500).json({ error: 'Failed to start verification.' });
  }
}

module.exports = { startVerification };