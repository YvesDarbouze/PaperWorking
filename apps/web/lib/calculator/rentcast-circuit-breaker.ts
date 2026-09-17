/**
 * RentCast Circuit Breaker & Cost Alarm Monitoring
 *
 * Prevents cascade failures and fee explosions when the upstream RentCast API
 * is degraded, failing, or approaching cost alarm thresholds.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // consecutive failures to open circuit (default: 3)
  cooldownMs?: number;        // ms before moving from OPEN to HALF_OPEN (default: 60,000)
}

export interface CostAlarmEvent {
  thresholdUsd: number;
  callCount: number;
  estimatedCostUsd: number;
  timestamp: Date;
}

// Cost thresholds in USD
export const COST_ALARM_THRESHOLDS = [50, 100, 250] as const;
export const ESTIMATED_COST_PER_CALL_USD = 0.10; // $0.10 per RentCast lookup

class RentCastCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  // Monthly usage tracking for cost alarms
  private monthlyCallCount = 0;
  private currentMonthKey = '';
  private triggeredThresholds = new Set<number>();

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 60_000;
    this.ensureCurrentMonth();
  }

  private ensureCurrentMonth(): void {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    if (this.currentMonthKey !== monthKey) {
      this.currentMonthKey = monthKey;
      this.monthlyCallCount = 0;
      this.triggeredThresholds.clear();
    }
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public isAvailable(): boolean {
    return this.getState() !== 'OPEN';
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.consecutiveFailures += 1;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public recordCall(): CostAlarmEvent | null {
    this.ensureCurrentMonth();
    this.monthlyCallCount += 1;
    const estimatedCost = this.monthlyCallCount * ESTIMATED_COST_PER_CALL_USD;

    for (const threshold of COST_ALARM_THRESHOLDS) {
      if (estimatedCost >= threshold && !this.triggeredThresholds.has(threshold)) {
        this.triggeredThresholds.add(threshold);
        const event: CostAlarmEvent = {
          thresholdUsd: threshold,
          callCount: this.monthlyCallCount,
          estimatedCostUsd: estimatedCost,
          timestamp: new Date(),
        };
        console.warn(`[RENTCAST COST ALARM] Crossed \$${threshold} threshold: ${this.monthlyCallCount} calls (~\$${estimatedCost.toFixed(2)})`);
        return event;
      }
    }
    return null;
  }

  public getMetrics(): {
    state: CircuitState;
    consecutiveFailures: number;
    monthlyCallCount: number;
    estimatedCostUsd: number;
    triggeredThresholds: number[];
  } {
    this.ensureCurrentMonth();
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      monthlyCallCount: this.monthlyCallCount,
      estimatedCostUsd: Number((this.monthlyCallCount * ESTIMATED_COST_PER_CALL_USD).toFixed(2)),
      triggeredThresholds: Array.from(this.triggeredThresholds),
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    this.monthlyCallCount = 0;
    this.triggeredThresholds.clear();
  }
}

export const rentCastCircuitBreaker = new RentCastCircuitBreaker();
