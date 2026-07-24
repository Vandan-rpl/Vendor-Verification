const BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "100", 10);
const DELAY_BETWEEN_EMAILS = parseInt(process.env.EMAIL_DELAY_MS || "2000", 10);
const PAUSE_AFTER_BATCH = parseInt(
  process.env.EMAIL_BATCH_PAUSE_MS || String(2 * 60 * 60 * 1000),
  10
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processQueue(items, sendFn, label = "emails") {
  const total = items.length;

  if (total === 0) {
    console.log(`[emailQueue] No ${label} to process.`);
    return;
  }

  console.log(`[emailQueue] Starting ${label}. Total: ${total}`);

  let processed = 0;

  for (const item of items) {
    try {
      await sendFn(item);
    } catch (err) {
      console.error(
        `[emailQueue] Failed (${processed + 1}/${total}):`,
        err.message
      );
    }

    processed++;

    console.log(
      `[emailQueue] Progress: ${processed}/${total} ${label} processed.`
    );

    // Don't wait after the last email
    if (processed < total) {
      await sleep(DELAY_BETWEEN_EMAILS);
    }

    // Pause after every batch
    if (processed % BATCH_SIZE === 0 && processed < total) {
      const batchNumber = processed / BATCH_SIZE;

      console.log(
        `[emailQueue] Batch ${batchNumber} completed (${processed}/${total}).`
      );

      console.log(
        `[emailQueue] Waiting ${PAUSE_AFTER_BATCH / (60 * 60 * 1000)} hour(s)...`
      );

      await sleep(PAUSE_AFTER_BATCH);

      console.log("[emailQueue] Resuming email sending...");
    }
  }

  console.log(
    `[emailQueue] Finished processing ${processed} ${label}.`
  );
}

module.exports = {
  processQueue,
};