import redis from '../redis';

/**
 * 🚦 Redis-Backed Sliding Window Rate Limiter
 * 
 * Specifically tuned for Zillow Bridge API defaults: 5,000 requests per hour.
 * Uses Redis Sorted Sets to track request timestamps with millisecond precision.
 */

const HOURLY_KEY = 'rate_limit:bridge_api:hourly';
const BURST_KEY = 'rate_limit:bridge_api:burst';
const PUBLIC_DAILY_KEY = 'rate_limit:bridge_api:public_daily';

const HOURLY_QUOTA = 5000;
const BURST_QUOTA = 334;
const PUBLIC_DAILY_QUOTA = 1000;

const HOURLY_WINDOW = 3600;      // 1 hour
const BURST_WINDOW = 60;        // 1 minute
const PUBLIC_DAILY_WINDOW = 86400; // 24 hours

export class RateLimiterService {
  private memoryWindow: number[] = [];
  private publicMemoryWindow: number[] = [];

  /**
   * Checks if the current request is within both Hourly and Burst quotas.
   * Increments the counter and returns the status.
   */
  async checkRateLimit(): Promise<{
    allowed: boolean;
    currentHourly: number;
    currentBurst: number;
  }> {
    const now = Date.now();
    const hourlyStart = now - (HOURLY_WINDOW * 1000);
    const burstStart = now - (BURST_WINDOW * 1000);

    // Try Redis first
    if (redis.status === 'ready') {
      try {
        const multi = redis.multi();
        
        // Hourly Window Logic
        multi.zadd(HOURLY_KEY, now, now.toString());
        multi.zremrangebyscore(HOURLY_KEY, 0, hourlyStart);
        multi.zcard(HOURLY_KEY);
        multi.expire(HOURLY_KEY, HOURLY_WINDOW + 60);

        // Burst Window Logic
        multi.zadd(BURST_KEY, now, now.toString());
        multi.zremrangebyscore(BURST_KEY, 0, burstStart);
        multi.zcard(BURST_KEY);
        multi.expire(BURST_KEY, BURST_WINDOW + 30);

        const results = await multi.exec();
        if (results) {
          const currentHourly = results[2][1] as number;
          const currentBurst = results[6][1] as number;

          const allowed = currentHourly <= HOURLY_QUOTA && currentBurst <= BURST_QUOTA;
          
          return {
            allowed,
            currentHourly,
            currentBurst,
          };
        }
      } catch (err) {
        console.error('❌ [RATE LIMITER] Redis Failure, falling back to memory:', err);
      }
    }

    // Fallback: Local Memory Sliding Window (Simple implementation for both)
    this.memoryWindow = this.memoryWindow.filter(ts => ts > hourlyStart);
    this.memoryWindow.push(now);

    const currentHourly = this.memoryWindow.length;
    const currentBurst = this.memoryWindow.filter(ts => ts > burstStart).length;

    return {
      allowed: currentHourly <= HOURLY_QUOTA && currentBurst <= BURST_QUOTA,
      currentHourly,
      currentBurst,
    };
  }

  /**
   * Helper to verify quota status without incrementing.
   */
  async getStatus(): Promise<{ hourly: number; burst: number }> {
    const now = Date.now();
    const hourlyStart = now - (HOURLY_WINDOW * 1000);
    const burstStart = now - (BURST_WINDOW * 1000);

    if (redis.status === 'ready') {
       try {
         const hourly = await redis.zcount(HOURLY_KEY, hourlyStart, now);
         const burst = await redis.zcount(BURST_KEY, burstStart, now);
         return { hourly, burst };
       } catch (err) {
         // Fallback
       }
    }

    return {
      hourly: this.memoryWindow.filter(ts => ts > hourlyStart).length,
      burst: this.memoryWindow.filter(ts => ts > burstStart).length,
    };
  }

  /**
   * Specifically checks the 1,000 req/day quota for Public Records (/pub).
   */
  async checkPublicRateLimit(): Promise<{ allowed: boolean; currentDaily: number }> {
    const now = Date.now();
    const dailyStart = now - (PUBLIC_DAILY_WINDOW * 1000);

    if (redis.status === 'ready') {
      try {
        const multi = redis.multi();
        multi.zadd(PUBLIC_DAILY_KEY, now, now.toString());
        multi.zremrangebyscore(PUBLIC_DAILY_KEY, 0, dailyStart);
        multi.zcard(PUBLIC_DAILY_KEY);
        multi.expire(PUBLIC_DAILY_KEY, PUBLIC_DAILY_WINDOW + 3600); // 25h total TTL

        const results = await multi.exec();
        if (results) {
          const currentDaily = results[2][1] as number;
          const allowed = currentDaily <= PUBLIC_DAILY_QUOTA;
          
          return { allowed, currentDaily };
        }
      } catch (err) {
        console.error('❌ [RATE LIMITER] Public-Redis failure, falling back to memory:', err);
      }
    }

    // Fallback
    this.publicMemoryWindow = this.publicMemoryWindow.filter(ts => ts > dailyStart);
    this.publicMemoryWindow.push(now);
    
    return {
      allowed: this.publicMemoryWindow.length <= PUBLIC_DAILY_QUOTA,
      currentDaily: this.publicMemoryWindow.length
    };
  }
}

export const bridgeRateLimiter = new RateLimiterService();
