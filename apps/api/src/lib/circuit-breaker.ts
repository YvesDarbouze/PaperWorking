/**
 * PaperWorking Error Resilience Engine — Circuit Breaker Pattern
 * 
 * Manages states for external dependencies (Stripe, Plaid, Google Maps, SendGrid, DocuSign).
 * States:
 * - CLOSED: Normal operation, passing calls through.
 * - OPEN: Failure threshold met (e.g. 5 failures in 60s), rejecting calls fast without attempting.
 * - HALF-OPEN: Recovery testing window after 30s timeout, allowing trial calls to test service health.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;   // Number of failures before opening (default: 5)
  windowMs?: number;           // Failure tracking window in ms (default: 60000 = 60s)
  resetTimeoutMs?: number;     // Time to remain OPEN before HALF-OPEN (default: 30000 = 30s)
}

export class CircuitBreaker {
  public name: string;
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private lastStateChange: number = Date.now();
  private options: Required<CircuitBreakerOptions>;

  constructor(name: string, options?: CircuitBreakerOptions) {
    this.name = name;
    this.options = {
      failureThreshold: options?.failureThreshold ?? 5,
      windowMs: options?.windowMs ?? 60000,
      resetTimeoutMs: options?.resetTimeoutMs ?? 30000,
    };
  }

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN' && now - this.lastStateChange >= this.options.resetTimeoutMs) {
      this.state = 'HALF-OPEN';
      this.lastStateChange = now;
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T> | T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) return Promise.resolve(fallback());
      throw new Error(`CircuitBreaker [${this.name}] is OPEN. Fast rejecting request.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return Promise.resolve(fallback());
      throw err;
    }
  }

  public onSuccess() {
    this.failures = [];
    if (this.state === 'HALF-OPEN') {
      this.state = 'CLOSED';
      this.lastStateChange = Date.now();
    }
  }

  public onFailure() {
    const now = Date.now();
    this.failures.push(now);
    // Keep only failures within the rolling window
    this.failures = this.failures.filter((t) => now - t <= this.options.windowMs);

    if (this.failures.length >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = now;
    }
  }

  public reset() {
    this.state = 'CLOSED';
    this.failures = [];
    this.lastStateChange = Date.now();
  }
}

// Registry of singleton Circuit Breakers for core external dependencies
export const circuitBreakers = {
  stripe: new CircuitBreaker('stripe', { failureThreshold: 5, windowMs: 60000, resetTimeoutMs: 30000 }),
  plaid: new CircuitBreaker('plaid', { failureThreshold: 5, windowMs: 60000, resetTimeoutMs: 30000 }),
  google_maps: new CircuitBreaker('google_maps', { failureThreshold: 5, windowMs: 60000, resetTimeoutMs: 30000 }),
  sendgrid: new CircuitBreaker('sendgrid', { failureThreshold: 5, windowMs: 60000, resetTimeoutMs: 30000 }),
  docusign: new CircuitBreaker('docusign', { failureThreshold: 5, windowMs: 60000, resetTimeoutMs: 30000 }),
};
