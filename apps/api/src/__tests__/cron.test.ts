import { describe, expect, it, jest } from '@jest/globals';
import { verifyCronAuth } from '../lib/cron/auth.js';
import {
  isBusinessHours,
  shouldRemindByCadence,
  parseBridgeSyncResources,
  shouldAutoDrain,
} from '../lib/cron/utils.js';
import {
  handleCronSendDigestGet,
  handleCronBridgeSyncGet,
  handleCronSyncTransactionsGet,
  handleCronLifecycleAlertsGet,
  handleCronProcessEmailNotificationsGet,
  handleCronRefreshPlaceIdsGet,
} from '../routes/cron/handlers.js';

describe('cron auth', () => {
  it('accepts bearer token in standard mode', () => {
    const result = verifyCronAuth(
      { authorization: 'Bearer secret123' },
      { mode: 'standard', cronSecret: 'secret123' },
    );
    expect(result.authorized).toBe(true);
  });

  it('accepts x-cron-secret in flexible mode', () => {
    const result = verifyCronAuth(
      { cronSecretHeader: 'secret123' },
      { mode: 'flexible', cronSecret: 'secret123' },
    );
    expect(result.authorized).toBe(true);
  });

  it('allows optional-if-unset when secret missing', () => {
    const result = verifyCronAuth({}, { mode: 'optional-if-unset', cronSecret: undefined, workerSecret: undefined });
    expect(result.authorized).toBe(true);
  });

  it('flags misconfiguration in strict mode without secret', () => {
    const result = verifyCronAuth({}, { mode: 'strict', cronSecret: undefined });
    expect(result.authorized).toBe(false);
    expect(result.misconfigured).toBe(true);
  });

  it('refresh-place-ids allows when secret unset', () => {
    expect(verifyCronAuth({}, { mode: 'refresh-place-ids', cronSecret: undefined }).authorized).toBe(true);
  });

  it('lender-reminders skips auth in test env', () => {
    expect(
      verifyCronAuth({}, { mode: 'lender-reminders', nodeEnv: 'test' }).authorized,
    ).toBe(true);
  });
});

describe('cron utils', () => {
  it('detects business hours on weekday morning', () => {
    const monday10am = new Date('2026-01-05T15:00:00.000Z'); // 10 AM EST
    expect(isBusinessHours('America/New_York', monday10am)).toBe(true);
  });

  it('evaluates reminder cadence', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    const yesterday = new Date('2026-01-09T00:00:00.000Z');
    expect(shouldRemindByCadence('daily', yesterday, now)).toBe(true);
    expect(shouldRemindByCadence('none', null, now)).toBe(false);
  });

  it('parses bridge sync resources', () => {
    const set = parseBridgeSyncResources('property,member');
    expect(set.has('property')).toBe(true);
    expect(set.has('office')).toBe(false);
  });

  it('defaults auto drain to true', () => {
    expect(shouldAutoDrain(undefined)).toBe(true);
    expect(shouldAutoDrain('false')).toBe(false);
  });
});

describe('cron handlers', () => {
  const authHeaders = { authorization: 'Bearer cron-secret' };
  const authConfig = { cronSecret: 'cron-secret', workerSecret: 'cron-secret' };

  it('send-digest returns processed users', async () => {
    const result = await handleCronSendDigestGet(authHeaders, {
      authConfig,
      run: async () => ({ processedUsers: ['u1', 'u2'], errors: [] }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      processedCount: 2,
      processed: ['u1', 'u2'],
      errors: [],
    });
  });

  it('bridge-sync passes query to injected runner', async () => {
    const run = jest.fn().mockResolvedValue({ ok: true, enqueued: { bridge_sync: 'job-1' } });

    await handleCronBridgeSyncGet(
      { resources: 'property', drain: 'false' },
      authHeaders,
      { authConfig, run, startTime: Date.now() },
    );

    expect(run).toHaveBeenCalledWith({
      resources: new Set(['property']),
      autoDrain: false,
    });
  });

  it('sync-transactions accepts flexible auth headers', async () => {
    const result = await handleCronSyncTransactionsGet(
      { authorization: 'Bearer cron-secret', cronSecretHeader: 'cron-secret' },
      { authConfig, run: async () => ({ synced: 1, failures: 0 }) },
    );

    expect(result.status).toBe(200);
  });

  it('sync-transactions rejects unauthorized', async () => {
    const result = await handleCronSyncTransactionsGet({}, {
      authConfig: { cronSecret: 'cron-secret' },
      run: async () => ({ synced: 1, failures: 0 }),
    });

    expect(result.status).toBe(401);
  });

  it('lifecycle-alerts includes duration', async () => {
    const result = await handleCronLifecycleAlertsGet(authHeaders, {
      authConfig,
      run: async () => ({
        projectsScanned: 5,
        totalAlertsFired: 2,
        totalAlertsDebounced: 1,
        errors: [],
      }),
      startTime: Date.now() - 100,
    });

    expect(result.status).toBe(200);
    const body = result.body as { projectsScanned: number; alertsFired: number; durationMs: number };
    expect(body.projectsScanned).toBe(5);
    expect(body.alertsFired).toBe(2);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('process-email-notifications reports partial errors as 500', async () => {
    const result = await handleCronProcessEmailNotificationsGet(authHeaders, {
      authConfig,
      run: async () => ({
        messagesProcessed: 1,
        queuedEmailsProcessed: 0,
        errors: [{ type: 'queue', error: 'fail' }],
      }),
    });

    expect(result.status).toBe(500);
  });

  it('refresh-place-ids works without secret', async () => {
    const result = await handleCronRefreshPlaceIdsGet({}, {
      run: async () => ({ refreshed: 3 }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ refreshed: 3 });
  });
});
