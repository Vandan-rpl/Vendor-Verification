const BATCH_SIZE = 100;
const DELAY_BETWEEN_EMAILS = 2000;               // 2 seconds
const PAUSE_AFTER_BATCH = 2 * 60 * 60 * 1000;     // 2 hours

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic rate-limited processor.
 * `items`  = array of anything to process (caller decides what belongs in this array —
 *            e.g. only primary vendor emails, or all verification emails, etc.)
 * `sendFn` = async (item) => {} — does the actual send + any DB bookkeeping for one item
 * `label`  = just for clearer console logs
 */
async function processQueue(items, sendFn, label = 'Email') {
  let count = 0;

  for (const item of items) {
    try {
      await sendFn(item);
    } catch (err) {
      console.error(`[emailQueue] Failed to process item:`, err.message, err.status);
    }

    count++;
    await sleep(DELAY_BETWEEN_EMAILS);

    if (count % BATCH_SIZE === 0 && count < items.length) {
      console.log(`[emailQueue] ${count} ${label} sent. Pausing for 2 hours...`);
      await sleep(PAUSE_AFTER_BATCH);
      console.log(`[emailQueue] Resuming ${label} sending...`);
    }
  }

  console.log(`[emailQueue] Done. Processed ${count} ${label}.`);
}

module.exports = { processQueue };