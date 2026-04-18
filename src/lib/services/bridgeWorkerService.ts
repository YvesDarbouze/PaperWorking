import redis from '../redis';

/**
 * 🚦 Bridge Worker Service (Circuit Breaker)
 * 
 * Manages the global execution state of background ingestion workers
 * based on Bridge API rate limit availability.
 */
class BridgeWorkerService {
  private readonly REDIS_PAUSE_KEY = 'bridge_worker:paused';
  private readonly DEFAULT_PAUSE_DURATION = 300; // 5 minutes in seconds

  /**
   * Checks if background work is currently paused due to rate limiting.
   */
  async isPaused(): Promise<boolean> {
    if (redis.status !== 'ready') return false;

    try {
      const isPaused = await redis.get(this.REDIS_PAUSE_KEY);
      return isPaused === 'true';
    } catch (error) {
      console.error('⚠️ [BRIDGE WORKER SERVICE] Redis check failed, assuming unpaused.');
      return false;
    }
  }

  /**
   * Triggers a temporary pause for all background workers.
   * Typically called when rate limit headers fall below a safe threshold (< 10).
   */
  async pause(durationSeconds: number = this.DEFAULT_PAUSE_DURATION): Promise<void> {
    console.warn(`🚨 [BRIDGE WORKER SERVICE] Quota critical. Pausing workers for ${durationSeconds}s.`);
    
    if (redis.status === 'ready') {
      try {
        await redis.set(this.REDIS_PAUSE_KEY, 'true', 'EX', durationSeconds);
      } catch (error) {
        console.error('❌ [BRIDGE WORKER SERVICE] Failed to set pause flag in Redis:', error);
      }
    }
  }

  /**
   * Clears the pause flag immediately.
   */
  async resume(): Promise<void> {
    console.log('✅ [BRIDGE WORKER SERVICE] Resuming worker operation.');
    
    if (redis.status === 'ready') {
      try {
        await redis.del(this.REDIS_PAUSE_KEY);
      } catch (error) {
        console.error('❌ [BRIDGE WORKER SERVICE] Failed to clear pause flag:', error);
      }
    }
  }
}

export const bridgeWorkerService = new BridgeWorkerService();
