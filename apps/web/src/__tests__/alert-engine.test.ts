import { describe, expect, it, beforeEach } from '@jest/globals';
import { AlertEngine } from '@paperworking/shared';

describe('W1-09: Alert Rules Register Evaluation', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine();
  });

  describe('Rule (a): 422 Tamper Detect on CalculatorSnapshot', () => {
    it('triggers critical security alert with destination REQUIRES CREDENTIALS on snapshot tamper event', () => {
      engine.recordSnapshotTamperEvent('Integrity hash mismatch on persist');

      const evaluation = engine.evaluateAlerts({}, new Date());
      expect(evaluation.hasActiveAlerts).toBe(true);

      const alert = evaluation.alerts.find((a) => a.rule === 'tamper_422_snapshot');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_SNAPSHOT_TAMPER_DETECTED');
      expect(alert!.destination).toBe('security alert (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });
  });

  describe('Rule (b): dead_letter_jobs > 0', () => {
    it('triggers critical page alert with destination REQUIRES CREDENTIALS when dead letter jobs exist', () => {
      const evaluation = engine.evaluateAlerts({ deadLetterJobs: 2 }, new Date());
      expect(evaluation.hasActiveAlerts).toBe(true);

      const alert = evaluation.alerts.find((a) => a.rule === 'dead_letter_jobs');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_DEAD_LETTER_JOBS_EXIST');
      expect(alert!.currentValue).toBe(2);
      expect(alert!.destination).toBe('page (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });

    it('does not trigger dead_letter_jobs alert when count is 0', () => {
      const evaluation = engine.evaluateAlerts({ deadLetterJobs: 0 }, new Date());
      const alert = evaluation.alerts.find((a) => a.rule === 'dead_letter_jobs');
      expect(alert).toBeUndefined();
    });
  });

  describe('Rule (c): Scheduler Heartbeat Older Than 20 Minutes', () => {
    it('triggers critical page alert with destination REQUIRES CREDENTIALS when heartbeat age > 20m (1200s)', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 minutes ago
      const evaluation = engine.evaluateAlerts({ lastHeartbeat: staleDate }, new Date());
      expect(evaluation.hasActiveAlerts).toBe(true);

      const alert = evaluation.alerts.find((a) => a.rule === 'job_heartbeat_missed');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_JOB_HEARTBEAT_MISSED');
      expect(alert!.threshold).toBe(1200);
      expect(alert!.destination).toBe('page (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });

    it('does not trigger heartbeat alert when heartbeat is recent (e.g. 5m ago)', () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const evaluation = engine.evaluateAlerts({ lastHeartbeat: recentDate }, new Date());
      const alert = evaluation.alerts.find((a) => a.rule === 'job_heartbeat_missed');
      expect(alert).toBeUndefined();
    });
  });

  describe('Rule (d): sendgrid.mode != "live" in Production', () => {
    it('triggers critical page alert with destination REQUIRES CREDENTIALS when sendgrid mode is unconfigured in prod', () => {
      const evaluation = engine.evaluateAlerts(
        {
          environment: 'production',
          sendgridMode: 'unconfigured',
        },
        new Date(),
      );

      const alert = evaluation.alerts.find((a) => a.rule === 'sendgrid_non_live');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_SENDGRID_NON_LIVE_IN_PRODUCTION');
      expect(alert!.destination).toBe('page (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });

    it('does not trigger sendgrid alert in non-production environments', () => {
      const evaluation = engine.evaluateAlerts(
        {
          environment: 'development',
          sendgridMode: 'unconfigured',
        },
        new Date(),
      );

      const alert = evaluation.alerts.find((a) => a.rule === 'sendgrid_non_live');
      expect(alert).toBeUndefined();
    });
  });

  describe('Rule (e): Plaid Webhook Verification Failure Spike', () => {
    it('triggers critical security alert with destination REQUIRES CREDENTIALS on verification failure spike (>= 3)', () => {
      engine.recordPlaidWebhookFailure('Bad signature 1');
      engine.recordPlaidWebhookFailure('Bad signature 2');
      engine.recordPlaidWebhookFailure('Expired JWT');

      const evaluation = engine.evaluateAlerts({}, new Date());
      const alert = evaluation.alerts.find((a) => a.rule === 'plaid_webhook_failure_spike');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_PLAID_WEBHOOK_VERIFICATION_SPIKE');
      expect(alert!.currentValue).toBe(3);
      expect(alert!.destination).toBe('security alert (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });
  });

  describe('Rule (f): DSR Erasure Completed', () => {
    it('logs compliance event with destination compliance log (Postgres audit_events)', () => {
      engine.recordDsrErasureCompleted({ userId: 'user-dsr-42', shreddedKeys: 1 });

      const evaluation = engine.evaluateAlerts({}, new Date());
      const alert = evaluation.alerts.find((a) => a.rule === 'dsr_erasure_completed');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('compliance');
      expect(alert!.code).toBe('LOG_DSR_ERASURE_COMPLETED');
      expect(alert!.destination).toBe('compliance log (Postgres audit_events)');
      expect(alert!.requiresCredentials).toBe(false);
    });
  });

  describe('Rule (g): High 5xx Error Rate', () => {
    it('triggers critical page alert with destination REQUIRES CREDENTIALS when 5xx count reaches threshold', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordResponse(500);
      }

      const evaluation = engine.evaluateAlerts({}, new Date());
      const alert = evaluation.alerts.find((a) => a.rule === '5xx_rate');
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe('critical');
      expect(alert!.code).toBe('ALERT_HIGH_5XX_RATE');
      expect(alert!.destination).toBe('page (REQUIRES CREDENTIALS)');
      expect(alert!.requiresCredentials).toBe(true);
    });
  });
});
