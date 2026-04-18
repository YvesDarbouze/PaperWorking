import redis from '../redis';

/**
 * 📊 API Health Monitoring Service
 * 
 * Captures and persists Bridge API quota health metrics.
 * Provides time-series data for dashboard visualization and alerting.
 */
class ApiHealthService {
  private readonly METRICS_STREAM_KEY = 'telemetry:bridge_api:quota';
  private readonly MAX_HISTORY = 1000; // Keep last 1000 data points

  /**
   * Logs current quota metrics into a Redis capped list.
   */
  async logQuotaMetrics(limit: number, remaining: number, burstLimit: number, burstRemaining: number): Promise<void> {
    const timestamp = Date.now();
    const data = JSON.stringify({
      timestamp,
      limit,
      remaining,
      burstLimit,
      burstRemaining,
      utilization: limit > 0 ? ((limit - remaining) / limit * 100).toFixed(2) : 0
    });

    if (redis.status === 'ready') {
      try {
        const multi = redis.multi();
        multi.lpush(this.METRICS_STREAM_KEY, data);
        multi.ltrim(this.METRICS_STREAM_KEY, 0, this.MAX_HISTORY - 1);
        await multi.exec();
        
        // Log to console in dev for visibility
        if (process.env.NODE_ENV !== 'production') {
           console.log(`📊 [API HEALTH] Quota Update: ${remaining}/${limit} (Burst: ${burstRemaining}/${burstLimit})`);
        }
      } catch (error) {
        console.error('❌ [API HEALTH SERVICE] Failed to persist analytics:', error);
      }
    }
  }

  /**
   * Retrieves the historical quota health data.
   */
  async getHealthHistory(count: number = 100): Promise<any[]> {
    if (redis.status !== 'ready') return [];

    try {
      const raw = await redis.lrange(this.METRICS_STREAM_KEY, 0, count - 1);
      return raw.map(item => JSON.parse(item));
    } catch (error) {
      console.error('❌ [API HEALTH SERVICE] Failed to fetch history:', error);
      return [];
    }
  }
}

export const apiHealthService = new ApiHealthService();
