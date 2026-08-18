import { CircuitBreaker } from '../circuit-breaker';
import { executeWithRetry, RETRY_PROFILES } from '../retry';
import { executeAddressFallbackLadder, getStreetViewFallback } from '../fallback';

describe('Error Resilience & Circuit Breaker Engine (AGENT P-2)', () => {
  test('CircuitBreaker transitions CLOSED -> OPEN -> HALF-OPEN', async () => {
    const cb = new CircuitBreaker('test_service', {
      failureThreshold: 2,
      windowMs: 10000,
      resetTimeoutMs: 50,
    });

    expect(cb.getState()).toBe('CLOSED');

    cb.onFailure();
    expect(cb.getState()).toBe('CLOSED');

    cb.onFailure(); // Threshold met (2)
    expect(cb.getState()).toBe('OPEN');

    // Attempting execute while OPEN fast rejects or calls fallback
    const fallbackCall = jest.fn().mockReturnValue('fallback_result');
    const result = await cb.execute(() => Promise.resolve('primary'), fallbackCall);

    expect(result).toBe('fallback_result');
    expect(fallbackCall).toHaveBeenCalled();

    // Wait for resetTimeout (50ms)
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.getState()).toBe('HALF-OPEN');

    // Primary call succeeds in HALF-OPEN -> transitions to CLOSED
    const successResult = await cb.execute(() => Promise.resolve('recovered'));
    expect(successResult).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  test('executeWithRetry retries failed function with backoff', async () => {
    let attempts = 0;
    const fn = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Transient failure');
      return 'success';
    });

    const result = await executeWithRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
      backoffFactor: 2,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('executeAddressFallbackLadder handles multi-tier fallback', async () => {
    // Autocomplete throws exception -> falls back to manual input
    const res = await executeAddressFallbackLadder(
      '123 Main St',
      () => Promise.reject(new Error('Maps API down'))
    );

    expect(res.tierUsed).toBe('manual_input');
    expect(res.isFallback).toBe(true);
    expect(res.data.addressLine).toBe('123 Main St');
  });

  test('getStreetViewFallback returns satellite tile when street view is missing', () => {
    const res = getStreetViewFallback(null, 30.2672, -97.7431);
    expect(res.tierUsed).toBe('satellite_tile');
    expect(res.data.imageUrl).toContain('staticmap');
  });
});
