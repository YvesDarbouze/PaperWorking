/**
 * src/lib/queue/jobQueue.ts
 *
 * Lightweight Redis list-based job queue built on the existing ioredis client.
 * No new dependencies — uses the project's existing REDIS_URL.
 *
 * Queue key format : paperworking:jobs:{type}
 * Retry tracking   : paperworking:jobs:{type}:retry:{id}
 * Dead-letter list : paperworking:jobs:dlq
 *
 * Enqueue with LPUSH, consume with RPOP so the list acts as a FIFO queue.
 */

import redis from '../redis';

export type JobType = 'bridge_sync' | 'webhook_process';

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  enqueuedAt: number;
  attempts: number;
}

const QUEUE_KEY = (type: JobType) => `paperworking:jobs:${type}`;
const RETRY_KEY = (type: JobType, id: string) => `paperworking:jobs:${type}:retry:${id}`;
const DLQ_KEY = 'paperworking:jobs:dlq';
const MAX_ATTEMPTS = 3;
const TTL_SECONDS = 60 * 60 * 24; // 24 h — jobs expire if never consumed

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const jobQueue = {
  /**
   * Push a new job onto the queue. Returns the assigned job ID.
   * Falls back to a no-op (logs a warning) when Redis is unavailable.
   */
  async enqueue<T>(type: JobType, payload: T): Promise<string> {
    const job: Job<T> = {
      id: generateId(),
      type,
      payload,
      enqueuedAt: Date.now(),
      attempts: 0,
    };

    if (redis.status !== 'ready') {
      console.warn(`⚠️ [JOB QUEUE] Redis unavailable — job ${type}:${job.id} not persisted.`);
      return job.id;
    }

    await redis.lpush(QUEUE_KEY(type), JSON.stringify(job));
    await redis.expire(QUEUE_KEY(type), TTL_SECONDS);

    console.log(`📥 [JOB QUEUE] Enqueued ${type}:${job.id}`);
    return job.id;
  },

  /**
   * Pop up to `limit` jobs from the queue in FIFO order.
   * Returns an empty array when Redis is unavailable or the queue is empty.
   */
  async dequeue<T = unknown>(type: JobType, limit = 1): Promise<Job<T>[]> {
    if (redis.status !== 'ready') return [];

    const jobs: Job<T>[] = [];

    for (let i = 0; i < limit; i++) {
      const raw = await redis.rpop(QUEUE_KEY(type));
      if (!raw) break;

      try {
        jobs.push(JSON.parse(raw) as Job<T>);
      } catch {
        console.error(`❌ [JOB QUEUE] Corrupt job payload discarded: ${raw}`);
      }
    }

    return jobs;
  },

  /** How many jobs are currently waiting for the given type. */
  async depth(type: JobType): Promise<number> {
    if (redis.status !== 'ready') return 0;
    return redis.llen(QUEUE_KEY(type));
  },

  /**
   * Increment the attempt counter for a job.
   * When MAX_ATTEMPTS is exceeded, move to the dead-letter queue instead.
   * Returns true when the job should be retried, false when it's been DLQ'd.
   */
  async recordAttempt(job: Job): Promise<boolean> {
    if (redis.status !== 'ready') return false;

    job.attempts += 1;

    if (job.attempts >= MAX_ATTEMPTS) {
      await redis.lpush(DLQ_KEY, JSON.stringify(job));
      await redis.expire(DLQ_KEY, TTL_SECONDS * 7); // keep DLQ entries for 7 days
      console.error(`🪦 [JOB QUEUE] Job ${job.type}:${job.id} moved to DLQ after ${job.attempts} attempts.`);
      return false;
    }

    // Re-queue with incremented attempts for retry
    await redis.lpush(QUEUE_KEY(job.type), JSON.stringify(job));
    await redis.expire(QUEUE_KEY(job.type), TTL_SECONDS);
    console.warn(`🔁 [JOB QUEUE] Job ${job.type}:${job.id} re-queued (attempt ${job.attempts}/${MAX_ATTEMPTS}).`);
    return true;
  },

  /** Peek at the DLQ without consuming (for observability). */
  async peekDlq(limit = 10): Promise<Job[]> {
    if (redis.status !== 'ready') return [];
    const raw = await redis.lrange(DLQ_KEY, 0, limit - 1);
    return raw.map((r: string) => {
      try { return JSON.parse(r) as Job; }
      catch { return null; }
    }).filter(Boolean) as Job[];
  },
};
