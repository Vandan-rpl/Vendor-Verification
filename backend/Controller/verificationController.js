const { processNewVerifications } = require('../Services/verificationService');

// Called when user clicks "Start Verification" on the Vendor Upload page.
// Responds immediately with how many vendors were queued — actual sending
// happens in the background at a rate-limited pace (see emailQueue.js).
async function startVerification(req, res) {
  try {
    const result = await processNewVerifications();

    if (result.queued === 0) {
      return res.status(200).json({ message: 'No pending vendors to send.', count: 0 });
    }

    return res.status(200).json({
      message: `${result.queued} vendor(s) queued for verification emails. Sending in progress.`,
      data: result.vendors
    });

  } catch (err) {
    console.error('startVerification error:', err);
    return res.status(500).json({ error: 'Failed to start verification.' });
  }
}

module.exports = { startVerification };