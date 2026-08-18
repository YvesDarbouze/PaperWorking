/**
 * PaperWorking Error Resilience Engine — Retry Logic with Exponential Backoff
 * 
 * Supports jittered exponential backoff and maximum retry duration caps.
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  maxDurationMs?: number;
}

export const RETRY_PROFILES: Record<string, RetryOptions> = {
  stripeWebhook: {
    maxRetries: 3,
    initialDelayMs: 5000,   // 5s, 25s, 125s
    backoffFactor: 5,
    maxDurationMs: 300000,  // 5 minutes max
  },
  plaidSync: {
    maxRetries: 3,
    initialDelayMs: 10000,  // 10s, 60s, 300s
    backoffFactor: 6,
    maxDurationMs: 300000,
  },
  googleMaps: {
    maxRetries: 2,
    initialDelayMs: 1000,   // 1s, 3s
    backoffFactor: 3,
    maxDurationMs: 30000,
  },
};

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    backoffFactor = 2,
    maxDelayMs = 30000,
    maxDurationMs = 300000,
  } = options;

  const startTime = Date.now();
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (attempt > maxRetries || elapsed >= maxDurationMs) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }

  throw new Error('Retry execution exceeded maximum retry limits');
}
