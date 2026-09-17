/**
 * Alert Rules Engine (Review B-11, H-15, H-35, W1-09)
 * Evaluates production alert register rules:
 * (a) 422 tamper-detect on CalculatorSnapshot -> security alert (REQUIRES CREDENTIALS)
 * (b) dead_letter_jobs > 0 -> page (REQUIRES CREDENTIALS)
 * (c) scheduler heartbeat older than 20 minutes -> page (REQUIRES CREDENTIALS)
 * (d) sendgrid.mode != "live" in production -> page (REQUIRES CREDENTIALS)
 * (e) plaid webhook verification failure spike -> security alert (REQUIRES CREDENTIALS)
 * (f) DSR erasure completed -> compliance log (Postgres audit_events)
 * (g) high 5xx error rate -> page (REQUIRES CREDENTIALS)
 */

export type AlertSeverity = 'warning' | 'critical' | 'compliance';

export type AlertRuleName =
  | '5xx_rate'
  | 'tamper_422_spike'
  | 'tamper_422_snapshot'
  | 'dead_letter_jobs'
  | 'job_heartbeat_missed'
  | 'sendgrid_non_live'
  | 'plaid_webhook_failure_spike'
  | 'dsr_erasure_completed'
  | 'alert_backlog_age';

export interface ActiveAlert {
  rule: AlertRuleName;
  code: string;
  severity: AlertSeverity;
  message: string;
  currentValue: number | string;
  threshold: number | string;
  destination: string;
  requiresCredentials?: boolean;
  timestamp: string;
}

export interface AlertEngineMetrics {
  alertBacklogAgeSeconds?: number;
  lastHeartbeat?: string | Date | null;
  pendingJobs?: number;
  deadLetterJobs?: number;
  environment?: string;
  sendgridMode?: 'live' | 'unconfigured' | 'mock';
  dsrErasureCompletedCount?: number;
}

export interface AlertEngineOptions {
  windowMs?: number;
  max5xxRateThreshold?: number; // e.g. 0.05 = 5%
  max5xxCountThreshold?: number; // e.g. 10 errors
  tamperCountThreshold?: number; // e.g. 5 occurrences
  maxPlaidWebhookFailureThreshold?: number; // e.g. 3 failures
  maxBacklogAgeSeconds?: number; // e.g. 300 seconds
  maxHeartbeatAgeSeconds?: number; // e.g. 1200 seconds (20 minutes)
}

export class AlertEngine {
  private readonly windowMs: number;
  private readonly max5xxRateThreshold: number;
  private readonly max5xxCountThreshold: number;
  private readonly tamperCountThreshold: number;
  private readonly maxPlaidWebhookFailureThreshold: number;
  private readonly maxBacklogAgeSeconds: number;
  private readonly maxHeartbeatAgeSeconds: number;

  private readonly responseTimestamps: Array<{ status: number; timestamp: number }> = [];
  private readonly tamperTimestamps: Array<{ reason?: string; timestamp: number }> = [];
  private readonly snapshotTamperTimestamps: Array<{ reason?: string; timestamp: number }> = [];
  private readonly plaidWebhookFailures: Array<{ reason?: string; timestamp: number }> = [];
  private readonly dsrErasureCompletedTimestamps: Array<{ details?: Record<string, unknown>; timestamp: number }> = [];

  constructor(options: AlertEngineOptions = {}) {
    this.windowMs = options.windowMs ?? 5 * 60 * 1000; // 5 minutes rolling window
    this.max5xxRateThreshold = options.max5xxRateThreshold ?? 0.05;
    this.max5xxCountThreshold = options.max5xxCountThreshold ?? 10;
    this.tamperCountThreshold = options.tamperCountThreshold ?? 5;
    this.maxPlaidWebhookFailureThreshold = options.maxPlaidWebhookFailureThreshold ?? 3;
    this.maxBacklogAgeSeconds = options.maxBacklogAgeSeconds ?? 300;
    this.maxHeartbeatAgeSeconds = options.maxHeartbeatAgeSeconds ?? 1200; // 20 minutes default per W1-09
  }

  recordResponse(status: number, timestamp = Date.now()): void {
    this.responseTimestamps.push({ status, timestamp });
    this.pruneOld(timestamp);
  }

  recordTamperEvent(reason?: string, timestamp = Date.now()): void {
    this.tamperTimestamps.push({ reason, timestamp });
    this.pruneOld(timestamp);
  }

  recordSnapshotTamperEvent(reason?: string, timestamp = Date.now()): void {
    this.snapshotTamperTimestamps.push({ reason, timestamp });
    this.tamperTimestamps.push({ reason, timestamp });
    this.pruneOld(timestamp);
  }

  recordPlaidWebhookFailure(reason?: string, timestamp = Date.now()): void {
    this.plaidWebhookFailures.push({ reason, timestamp });
    this.pruneOld(timestamp);
  }

  recordDsrErasureCompleted(details?: Record<string, unknown>, timestamp = Date.now()): void {
    this.dsrErasureCompletedTimestamps.push({ details, timestamp });
    this.pruneOld(timestamp);
  }

  reset(): void {
    this.responseTimestamps.length = 0;
    this.tamperTimestamps.length = 0;
    this.snapshotTamperTimestamps.length = 0;
    this.plaidWebhookFailures.length = 0;
    this.dsrErasureCompletedTimestamps.length = 0;
  }

  private pruneOld(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.responseTimestamps.length > 0 && this.responseTimestamps[0].timestamp < cutoff) {
      this.responseTimestamps.shift();
    }
    while (this.tamperTimestamps.length > 0 && this.tamperTimestamps[0].timestamp < cutoff) {
      this.tamperTimestamps.shift();
    }
    while (this.snapshotTamperTimestamps.length > 0 && this.snapshotTamperTimestamps[0].timestamp < cutoff) {
      this.snapshotTamperTimestamps.shift();
    }
    while (this.plaidWebhookFailures.length > 0 && this.plaidWebhookFailures[0].timestamp < cutoff) {
      this.plaidWebhookFailures.shift();
    }
    while (this.dsrErasureCompletedTimestamps.length > 0 && this.dsrErasureCompletedTimestamps[0].timestamp < cutoff) {
      this.dsrErasureCompletedTimestamps.shift();
    }
  }

  evaluateAlerts(metrics: AlertEngineMetrics = {}, now: Date = new Date()): {
    hasActiveAlerts: boolean;
    alerts: ActiveAlert[];
    summary: string;
  } {
    const nowMs = now.getTime();
    this.pruneOld(nowMs);
    const alerts: ActiveAlert[] = [];
    const timestamp = now.toISOString();

    // Rule (g): High 5xx Error Rate -> page (REQUIRES CREDENTIALS)
    const totalRequests = this.responseTimestamps.length;
    const errors5xx = this.responseTimestamps.filter((r) => r.status >= 500 && r.status < 600).length;
    const rate5xx = totalRequests > 0 ? errors5xx / totalRequests : 0;

    if (errors5xx >= this.max5xxCountThreshold || (totalRequests >= 20 && rate5xx >= this.max5xxRateThreshold)) {
      alerts.push({
        rule: '5xx_rate',
        code: 'ALERT_HIGH_5XX_RATE',
        severity: 'critical',
        message: `High 5xx error rate: ${errors5xx} errors (${(rate5xx * 100).toFixed(1)}% of ${totalRequests} requests) in last 5m`,
        currentValue: errors5xx,
        threshold: this.max5xxCountThreshold,
        destination: 'page (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (a): 422 Tamper Detect on CalculatorSnapshot -> security alert (REQUIRES CREDENTIALS)
    if (this.snapshotTamperTimestamps.length > 0) {
      alerts.push({
        rule: 'tamper_422_snapshot',
        code: 'ALERT_SNAPSHOT_TAMPER_DETECTED',
        severity: 'critical',
        message: `CalculatorSnapshot 422 tamper attack detected: ${this.snapshotTamperTimestamps.length} tamper/integrity mismatch events in last 5m`,
        currentValue: this.snapshotTamperTimestamps.length,
        threshold: 1,
        destination: 'security alert (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Generic 422 Tamper Spike -> security alert (REQUIRES CREDENTIALS)
    const tamperCount = this.tamperTimestamps.length;
    if (tamperCount >= this.tamperCountThreshold) {
      alerts.push({
        rule: 'tamper_422_spike',
        code: 'ALERT_ATTACK_SIGNAL_TAMPER_422',
        severity: 'critical',
        message: `Tamper / 422 spike detected: ${tamperCount} tampering / CSRF events in last 5m (active attack signal)`,
        currentValue: tamperCount,
        threshold: this.tamperCountThreshold,
        destination: 'security alert (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (b): dead_letter_jobs > 0 -> page (REQUIRES CREDENTIALS)
    const deadLetterJobs = metrics.deadLetterJobs ?? 0;
    if (deadLetterJobs > 0) {
      alerts.push({
        rule: 'dead_letter_jobs',
        code: 'ALERT_DEAD_LETTER_JOBS_EXIST',
        severity: 'critical',
        message: `Dead letter queue contains ${deadLetterJobs} failed job(s) requiring on-call intervention`,
        currentValue: deadLetterJobs,
        threshold: '> 0',
        destination: 'page (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (c): Scheduler heartbeat older than 20 minutes -> page (REQUIRES CREDENTIALS)
    if (metrics.lastHeartbeat) {
      const lastHbDate = typeof metrics.lastHeartbeat === 'string' ? new Date(metrics.lastHeartbeat) : metrics.lastHeartbeat;
      const hbAgeSeconds = Math.max(0, Math.round((nowMs - lastHbDate.getTime()) / 1000));
      if (hbAgeSeconds > this.maxHeartbeatAgeSeconds) {
        alerts.push({
          rule: 'job_heartbeat_missed',
          code: 'ALERT_JOB_HEARTBEAT_MISSED',
          severity: 'critical',
          message: `Job runner missed heartbeat: last heartbeat was ${hbAgeSeconds}s ago (threshold: ${this.maxHeartbeatAgeSeconds}s / 20m)`,
          currentValue: hbAgeSeconds,
          threshold: this.maxHeartbeatAgeSeconds,
          destination: 'page (REQUIRES CREDENTIALS)',
          requiresCredentials: true,
          timestamp,
        });
      }
    } else if (metrics.pendingJobs && metrics.pendingJobs > 0) {
      alerts.push({
        rule: 'job_heartbeat_missed',
        code: 'ALERT_JOB_HEARTBEAT_MISSED',
        severity: 'critical',
        message: `Job runner has ${metrics.pendingJobs} pending jobs but zero recorded heartbeat`,
        currentValue: 'missing',
        threshold: `${this.maxHeartbeatAgeSeconds}s`,
        destination: 'page (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (d): sendgrid.mode != "live" in production -> page (REQUIRES CREDENTIALS)
    const env = metrics.environment ?? process.env.NODE_ENV;
    if (env === 'production' && metrics.sendgridMode && metrics.sendgridMode !== 'live') {
      alerts.push({
        rule: 'sendgrid_non_live',
        code: 'ALERT_SENDGRID_NON_LIVE_IN_PRODUCTION',
        severity: 'critical',
        message: `SendGrid mode is '${metrics.sendgridMode}' in production environment (expected 'live')`,
        currentValue: metrics.sendgridMode,
        threshold: 'live',
        destination: 'page (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (e): Plaid webhook verification failure spike -> security alert (REQUIRES CREDENTIALS)
    if (this.plaidWebhookFailures.length >= this.maxPlaidWebhookFailureThreshold) {
      alerts.push({
        rule: 'plaid_webhook_failure_spike',
        code: 'ALERT_PLAID_WEBHOOK_VERIFICATION_SPIKE',
        severity: 'critical',
        message: `Plaid webhook verification failure spike: ${this.plaidWebhookFailures.length} signature verification failures in last 5m`,
        currentValue: this.plaidWebhookFailures.length,
        threshold: this.maxPlaidWebhookFailureThreshold,
        destination: 'security alert (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    // Rule (f): DSR erasure completed -> compliance log (Postgres audit_events)
    const dsrCount = this.dsrErasureCompletedTimestamps.length || (metrics.dsrErasureCompletedCount ?? 0);
    if (dsrCount > 0) {
      alerts.push({
        rule: 'dsr_erasure_completed',
        code: 'LOG_DSR_ERASURE_COMPLETED',
        severity: 'compliance',
        message: `Data Subject Request (DSR) user erasure completed for ${dsrCount} request(s)`,
        currentValue: dsrCount,
        threshold: 'completed',
        destination: 'compliance log (Postgres audit_events)',
        requiresCredentials: false,
        timestamp,
      });
    }

    // Backlog Age Rule (Warning)
    const backlogAge = metrics.alertBacklogAgeSeconds ?? 0;
    if (backlogAge > this.maxBacklogAgeSeconds) {
      alerts.push({
        rule: 'alert_backlog_age',
        code: 'ALERT_BACKLOG_AGE_EXCEEDED',
        severity: 'warning',
        message: `Alert delivery backlog age (${backlogAge}s) exceeds threshold (${this.maxBacklogAgeSeconds}s)`,
        currentValue: backlogAge,
        threshold: this.maxBacklogAgeSeconds,
        destination: 'page (REQUIRES CREDENTIALS)',
        requiresCredentials: true,
        timestamp,
      });
    }

    return {
      hasActiveAlerts: alerts.length > 0,
      alerts,
      summary: alerts.length === 0 ? 'All alert rules passing normally' : `${alerts.length} active alert(s) detected`,
    };
  }
}

export const alertEngine = new AlertEngine();

