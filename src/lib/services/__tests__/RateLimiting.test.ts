import { BridgeErrorHandler } from '../bridgeErrorHandler';
import { BridgeRateLimitError } from '../../types/errors';
import redis from '../../redis';

/**
 * 🚦 Rate Limiting & 429 Mocking Tests
 * 
 * Verifies that the BridgeErrorHandler correctly identifies rate limit exhaustion
 * from the Bridge API and orchestrates a system-wide pause via the BridgeWorkerService.
 */

// Global mock for Redis to intercept pause/resume orchestration
jest.mock('../../redis', () => ({
  __esModule: true,
  default: {
    status: 'ready',
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue({
      lpush: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    })
  },
}));

describe('Rate Limiting (429 Error Handling)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure redis status is ready for the pause logic to trigger
    (redis as any).status = 'ready';
  });

  it('correctly parses Application-RateLimit-Reset headers and triggers a system pause', async () => {
    // 1. Define a future reset time (2 minutes from now)
    const pauseDurationSeconds = 120;
    const futureResetTimestamp = Math.floor(Date.now() / 1000) + pauseDurationSeconds;

    // 2. Construct a mock Axios 429 response
    const mockError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Daily quota reached for application.'
          }
        },
        headers: {
          'application-ratelimit-reset': futureResetTimestamp.toString()
        }
      },
      config: {
        url: 'https://api.bridgedataoutput.com/api/v2/test/Property'
      }
    };

    // 3. Invoke the central error handler
    // This will trigger bridgeWorkerService.pause(duration) internally
    const handledError = BridgeErrorHandler.handle(mockError);

    // 4. Verify Error Classification
    expect(handledError).toBeInstanceOf(BridgeRateLimitError);
    expect((handledError as BridgeRateLimitError).resetAt).toBe(futureResetTimestamp);

    /**
     * 🛡️ VERIFICATION: Logic Guardrail
     * The system must set the Redis 'bridge_worker:paused' key with the 
     * correct expiration (EX) matching the time until the reset header.
     */
    expect(redis.set).toHaveBeenCalledWith(
      'bridge_worker:paused',
      'true',
      'EX',
      expect.any(Number) // The exactly calculated duration
    );

    // Verify the duration passed to Redis is accurate (allowing for 1s execution jitter)
    const durationSentToRedis = (redis.set as jest.Mock).mock.calls[0][3];
    expect(durationSentToRedis).toBeGreaterThanOrEqual(pauseDurationSeconds - 2);
    expect(durationSentToRedis).toBeLessThanOrEqual(pauseDurationSeconds);
  });

  it('falls back to a default 60s pause if reset headers are missing', async () => {
    const mockErrorWithoutHeaders = {
      isAxiosError: true,
      response: {
        status: 429,
        headers: {} // No reset headers
      }
    };

    BridgeErrorHandler.handle(mockErrorWithoutHeaders);

    // Expecting the default 60s fallback defined in BridgeErrorHandler.ts:69
    expect(redis.set).toHaveBeenCalledWith(
      'bridge_worker:paused',
      'true',
      'EX',
      60
    );
  });
});
