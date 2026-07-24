const cron = require('node-cron');
const { processNewVerifications, processReminders, processExpirations } = require('../Services/verificationService');

function startCronJobs() {
  // Every 15 minutes: send verification emails to any newly uploaded vendors
  cron.schedule('*/15 * * * *', async () => {
    try {
      const sent = await processNewVerifications();
      if (sent.length > 0) {
        console.log(`[cron] Sent ${sent.length} new verification email(s).`);
      }
    } catch (err) {
      console.error('[cron] processNewVerifications failed:', err);
    }
  });

  // Daily at 9 AM: send reminders to vendors who haven't responded
  cron.schedule('0 9 * * *', async () => {
    try {
      const reminded = await processReminders();
      if (reminded.length > 0) {
        console.log(`[cron] Sent ${reminded.length} reminder email(s).`);
      }
    } catch (err) {
      console.error('[cron] processReminders failed:', err);
    }
  });

  // Daily at midnight: mark stale requests as expired
  cron.schedule('0 0 * * *', async () => {
    try {
      await processExpirations();
      console.log('[cron] Expired stale verification requests.');
    } catch (err) {
      console.error('[cron] processExpirations failed:', err);
    }
  });

  console.log('Verification cron jobs scheduled.');
}

module.exports = { startCronJobs };