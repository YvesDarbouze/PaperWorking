// ─── Token Bucket Rate Limiter ────────────────────────────────────────────────
// Respects the 20 requests/second limit documented by RentCast.
// Callers await `limiter.acquire()` before issuing a fetch.

export class TokenBucketLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private lastRefill: number;
  private waitQueue: Array<() => void> = [];

  /**
   * @param maxRequestsPerSecond Maximum requests per second (default 20 per RentCast docs)
   */
  constructor(maxRequestsPerSecond: number = 20) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.refillRate = maxRequestsPerSecond / 1000; // tokens per ms
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Acquire a token. Resolves immediately if available,
   * otherwise waits until a token is refilled.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time until 1 token is available
    const deficit = 1 - this.tokens;
    const waitMs = Math.ceil(deficit / this.refillRate);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.refill();
        this.tokens = Math.max(0, this.tokens - 1);
        resolve();
      }, waitMs);
    });
  }

  /** Current token count (for testing / observability) */
  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /** Reset to full capacity (for testing) */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/** Shared singleton limiter — all RentCast calls go through this. */
export const rentCastLimiter = new TokenBucketLimiter(20);
