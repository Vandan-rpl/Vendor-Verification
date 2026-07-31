const cron = require('node-cron');
const {
  processNewVerifications,
  processReminders,
  processExpirations,
} = require('../Services/verificationService');

const activeJobs = new Map();

function scheduleWithLock(expression, jobName, jobFn) {
  cron.schedule(
    expression,
    async () => {
      console.log(`[cron] Triggering ${jobName} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

      if (activeJobs.has(jobName)) {
        console.warn(`[cron] Skipping ${jobName}; previous run is still in progress.`);
        return;
      }

      activeJobs.set(jobName, true);

      try {
        await jobFn();
      } catch (err) {
        console.error(`[cron] ${jobName} failed:`, err);
      } finally {
        activeJobs.delete(jobName);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
}

function startCronJobs() {
  // Every 15 minutes: send verification emails to any newly uploaded vendors
  scheduleWithLock('*/15 * * * *', 'processNewVerifications', async () => {
    const sent = await processNewVerifications();
    if (sent?.queued > 0) {
      console.log(`[cron] Queued ${sent.queued} verification email(s).`);
    }
  });

  // Every 2 minutes: send reminders to vendors who haven't responded
  // (change back to '0 9 * * *' for a once-daily 9 AM run if that's what you want)
  scheduleWithLock('0 9 * * * *', 'processReminders', async () => {
    const reminded = await processReminders();
    if (reminded?.queued > 0) {
      console.log(`[cron] Queued ${reminded.queued} reminder email(s).`);
    }
  });

  // Every 5 minutes: mark stale requests as expired
  // (change back to '0 0 * * *' for a once-daily midnight run if that's what you want)
  scheduleWithLock('0 0 * * * *', 'processExpirations', async () => {
    await processExpirations();
    console.log('[cron] Expired stale verification requests.');
  });

  console.log('Verification cron jobs scheduled.');
}

module.exports = { startCronJobs };