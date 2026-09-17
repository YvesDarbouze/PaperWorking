import { describe, expect, it, beforeEach } from '@jest/globals';
import { AlertEngine } from '@paperworking/shared';

describe('Alert Rules Engine (Review B-11, H-15, H-35)', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine({
      windowMs: 300_000, // 5 minute rolling window
      max5xxRateThreshold: 0.05,
      max5xxCountThreshold: 10,
      tamperCountThreshold: 5,
      maxBacklogAgeSeconds: 300,
      maxHeartbeatAgeSeconds: 300,
    });
  });

  describe('1. 5xx Error Rate / Count Rule', () => {
    it('does not trigger when errors are below threshold', () => {
      for (let i = 0; i < 50; i++) {
        engine.recordResponse(200);
      }
      engine.recordResponse(500);

      const evaluation = engine.evaluateAlerts();
      expect(evaluation.hasActiveAlerts).toBe(false);
      expect(evaluation.alerts.some((a) => a.rule === '5xx_rate')).toBe(false);
    });

    it('triggers critical alert when 5xx count reaches threshold (>=10)', () => {
      for (let i = 0; i < 10; i++) {
        engine.recordResponse(500);
      }

      const evaluation = engine.evaluateAlerts();
      expect(evaluation.hasActiveAlerts).toBe(true);
      const alert = evaluation.alerts.find((a) => a.rule === '5xx_rate');
      expect(alert).toBeDefined();
      expect(alert?.code).toBe('ALERT_HIGH_5XX_RATE');
      expect(alert?.severity).toBe('critical');
    });

    it('triggers critical alert when 5xx rate exceeds 5% of requests', () => {
      for (let i = 0; i < 94; i++) {
        engine.recordResponse(200);
      }
      for (let i = 0; i < 6; i++) {
        engine.recordResponse(502);
      }

      const evaluation = engine.evaluateAlerts();
      const alert = evaluation.alerts.find((a) => a.rule === '5xx_rate');
      expect(alert).toBeDefined();
    });
  });

  describe('2. Tamper-422 Spike Alert Rule (= Attack Signal)', () => {
    it('triggers critical alert on tamper / 422 spike reaching threshold (>=5 in 5m)', () => {
      for (let i = 0; i < 5; i++) {
        engine.recordTamperEvent(`Potential CSRF / HMAC mismatch on request ${i}`);
      }

      const evaluation = engine.evaluateAlerts();
      expect(evaluation.hasActiveAlerts).toBe(true);
      const alert = evaluation.alerts.find((a) => a.rule === 'tamper_422_spike');
      expect(alert).toBeDefined();
      expect(alert?.code).toBe('ALERT_ATTACK_SIGNAL_TAMPER_422');
      expect(alert?.severity).toBe('critical');
      expect(alert?.message).toContain('active attack signal');
    });

    it('clears tamper alert once window expires', () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        engine.recordTamperEvent('CSRF violation', now - 400_000); // 6.6m ago
      }

      const evaluation = engine.evaluateAlerts({}, new Date(now));
      expect(evaluation.alerts.some((a) => a.rule === 'tamper_422_spike')).toBe(false);
    });
  });

  describe('3. Alert Backlog Age Rule (>300s)', () => {
    it('does not trigger when backlog is fresh (<=300s)', () => {
      const evaluation = engine.evaluateAlerts({
        alertBacklogAgeSeconds: 120,
        pendingJobs: 5,
      });

      expect(evaluation.alerts.some((a) => a.rule === 'alert_backlog_age')).toBe(false);
    });

    it('triggers warning alert when backlog age exceeds 300s', () => {
      const evaluation = engine.evaluateAlerts({
        alertBacklogAgeSeconds: 360,
        pendingJobs: 12,
      });

      expect(evaluation.hasActiveAlerts).toBe(true);
      const alert = evaluation.alerts.find((a) => a.rule === 'alert_backlog_age');
      expect(alert).toBeDefined();
      expect(alert?.code).toBe('ALERT_BACKLOG_AGE_EXCEEDED');
      expect(alert?.severity).toBe('warning');
      expect(alert?.message).toContain('360s');
    });
  });

  describe('4. Missed Job Heartbeat Rule (>300s)', () => {
    it('triggers critical alert when scheduler heartbeat has been missed for >300s', () => {
      const staleHeartbeat = new Date(Date.now() - 400_000).toISOString();

      const evaluation = engine.evaluateAlerts({
        lastHeartbeat: staleHeartbeat,
      });

      expect(evaluation.hasActiveAlerts).toBe(true);
      const alert = evaluation.alerts.find((a) => a.rule === 'job_heartbeat_missed');
      expect(alert).toBeDefined();
      expect(alert?.code).toBe('ALERT_JOB_HEARTBEAT_MISSED');
      expect(alert?.severity).toBe('critical');
    });

    it('does not trigger when heartbeat is fresh', () => {
      const freshHeartbeat = new Date(Date.now() - 60_000).toISOString();

      const evaluation = engine.evaluateAlerts({
        lastHeartbeat: freshHeartbeat,
      });

      expect(evaluation.alerts.some((a) => a.rule === 'job_heartbeat_missed')).toBe(false);
    });
  });
});
