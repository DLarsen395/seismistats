/**
 * USGS Sync Scheduler
 * Handles periodic and manual sync from USGS FDSN API
 */

import cron from 'node-cron';
import { config } from '../config/index.js';
import { syncFromUSGS, SyncOptions } from '../services/usgs-sync.js';

let cronJob: cron.ScheduledTask | null = null;
let jobCounter = 0;

/**
 * Start the automatic sync scheduler
 */
export function startSyncScheduler(): void {
  if (cronJob) {
    console.warn('Sync scheduler already running');
    return;
  }

  const cronExpression = `*/${config.usgs.syncIntervalMinutes} * * * *`;

  cronJob = cron.schedule(cronExpression, async () => {
    console.log(`[USGS Sync] Running scheduled sync...`);

    try {
      // Sync last 30 minutes of data
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 60 * 1000);

      await syncFromUSGS({
        startDate,
        endDate,
        minMagnitude: -2,
      });

      console.log(`[USGS Sync] Scheduled sync complete`);
    } catch (err) {
      console.error('[USGS Sync] Scheduled sync failed:', err);
    }
  });

  console.log(`[USGS Sync] Scheduler started with cron: ${cronExpression}`);
}

/**
 * Stop the automatic sync scheduler
 */
export function stopSyncScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[USGS Sync] Scheduler stopped');
  }
}

/**
 * Trigger a manual sync job
 */
export async function triggerManualSync(options: SyncOptions): Promise<string> {
  const jobId = `manual-${++jobCounter}-${Date.now()}`;

  console.log(`[USGS Sync] Manual sync triggered (${jobId}):`, options);

  // Run async (don't await)
  syncFromUSGS(options)
    .then(() => console.log(`[USGS Sync] Manual sync ${jobId} complete`))
    .catch((err) => console.error(`[USGS Sync] Manual sync ${jobId} failed:`, err));

  return jobId;
}
