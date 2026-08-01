/**
 * src/lib/queue/jobConsumer.ts
 *
 * Processes jobs dequeued from the Redis job queue.
 * Each job type maps to one handler. Failures are retried up to MAX_ATTEMPTS
 * (tracked by jobQueue.recordAttempt) and then moved to the DLQ.
 *
 * Called from /api/worker/drain which is triggered by an external scheduler
 * (Vercel Cron, Firebase Scheduler, or a simple cURL from cron).
 */

import { jobQueue, Job, JobType } from './jobQueue';
import { replicationWorker } from '../services/replicationWorker';
import { memberReplicationWorker } from '../services/memberReplicationWorker';
import { officeReplicationWorker } from '../services/officeReplicationWorker';
import { processWebhookPayload } from '../services/webhookProcessor';
import { timelineSyncWorker } from '../services/timelineSyncWorker';
import { TransactionNotificationService } from '../notifications/transactionNotifications';

export interface DrainResult {
  processed: number;
  failed: number;
  skipped: number;
}

type JobHandler = (job: Job) => Promise<void>;

const handlers: Record<JobType, JobHandler> = {
  bridge_sync: async (_job) => {
    const result = await replicationWorker.sync();
    if (!result.success) throw new Error(result.error ?? 'bridge_sync failed');
    console.log(`✅ [CONSUMER] bridge_sync complete — ${result.syncedCount} records.`);
  },

  member_sync: async (_job) => {
    const result = await memberReplicationWorker.sync();
    if (!result.success) throw new Error(result.error ?? 'member_sync failed');
    console.log(`✅ [CONSUMER] member_sync complete — ${result.syncedCount} members.`);
  },

  office_sync: async (_job) => {
    const result = await officeReplicationWorker.sync();
    if (!result.success) throw new Error(result.error ?? 'office_sync failed');
    console.log(`✅ [CONSUMER] office_sync complete — ${result.syncedCount} offices.`);
  },

  webhook_process: async (job) => {
    const result = await processWebhookPayload(job.payload);
    if (!result.success) throw new Error(result.reason ?? 'webhook_process failed');
  },

  timeline_sync: async (job) => {
    const { projectId } = job.payload as { projectId: string };
    if (!projectId) throw new Error('Missing projectId in payload');
    const result = await timelineSyncWorker.sync(projectId);
    if (!result.success) throw new Error(result.error ?? 'timeline_sync failed');
  },

  transaction_notification_batch: async (_job) => {
    await TransactionNotificationService.flushHourlyBatches();
    console.log('✅ [CONSUMER] transaction_notification_batch flush complete.');
  },
};

/**
 * Drain up to `batchSize` jobs from a single queue type.
 * Returns counts for observability.
 */
async function drainQueue(type: JobType, batchSize: number): Promise<DrainResult> {
  const jobs = await jobQueue.dequeue(type, batchSize);
  let processed = 0, failed = 0, skipped = 0;

  for (const job of jobs) {
    const handler = handlers[type];
    if (!handler) {
      console.warn(`⚠️ [CONSUMER] No handler for job type "${type}". Skipping.`);
      skipped++;
      continue;
    }

    try {
      await handler(job);
      processed++;
    } catch (err) {
      console.error(`❌ [CONSUMER] Job ${type}:${job.id} failed:`, (err as Error).message);
      const willRetry = await jobQueue.recordAttempt(job);
      if (!willRetry) failed++;
    }
  }

  return { processed, failed, skipped };
}

/**
 * Drain all known queues in one pass.
 * @param batchSize Max jobs to consume per queue type per invocation.
 */
export async function drainAll(batchSize = 5): Promise<Record<JobType, DrainResult>> {
  const types: JobType[] = ['bridge_sync', 'member_sync', 'office_sync', 'webhook_process', 'timeline_sync'];
  const results = {} as Record<JobType, DrainResult>;

  for (const type of types) {
    results[type] = await drainQueue(type, batchSize);
  }

  return results;
}

