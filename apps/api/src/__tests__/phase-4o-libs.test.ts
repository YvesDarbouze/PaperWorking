import { describe, expect, it } from '@jest/globals';
import { buildSparklineMetric, countProjectsByPhase } from '../lib/dashboard/sparkline.js';
import {
  groupMessagesIntoThreads,
  validateCreateMessageBody,
  generateMessageId,
} from '../lib/messages/threads.js';
import {
  validateWorkspaceLogoUpload,
  validateWorkspaceDeleteConfirmation,
  computeDeletionScheduleDate,
  parseWorkspaceAction,
} from '../lib/workspace/validation.js';
import { notificationPreferencesSchema } from '../lib/user/notification-preferences.js';
import {
  buildSecuritySettingsUpdate,
  shouldInvalidateSessionsOnSsoEnable,
  DEFAULT_SECURITY_SETTINGS,
} from '../lib/security/settings.js';

describe('dashboard sparkline libs', () => {
  it('buildSparklineMetric computes delta from prior period', () => {
    const metric = buildSparklineMetric(
      [
        { period: '2026-01', noi: 1200 },
        { period: '2026-02', noi: 1500 },
      ],
      1800,
      (s) => Number(s.noi || 0),
    );
    expect(metric.sparkline).toEqual([1200, 1500]);
    // current (1800) - prior sparkline point (1200) = 600
    expect(metric.delta).toBe(600);
    expect(metric.insufficientData).toBe(false);
  });

  it('countProjectsByPhase maps phase numbers', () => {
    expect(
      countProjectsByPhase([{ currentPhase: 1 }, { currentPhase: 3 }, { currentPhase: 4 }]),
    ).toEqual({ Acquisition: 1, Fund: 0, Hold: 1, Exit: 1 });
  });
});

describe('messages libs', () => {
  it('groupMessagesIntoThreads aggregates unread counts', () => {
    const threads = groupMessagesIntoThreads([
      { id: '1', threadId: 't1', read: false, createdAt: '2026-01-02', subject: 'Hi' },
      { id: '2', threadId: 't1', read: true, createdAt: '2026-01-01', subject: 'Hi' },
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].unreadCount).toBe(1);
  });

  it('validateCreateMessageBody requires sender/recipient/content', () => {
    expect(validateCreateMessageBody({}).ok).toBe(false);
    expect(
      validateCreateMessageBody({
        senderId: 'a',
        recipientId: 'b',
        content: 'hello',
      }).ok,
    ).toBe(true);
  });

  it('generateMessageId uses msg prefix', () => {
    expect(generateMessageId(() => 1)).toMatch(/^msg_1_/);
  });
});

describe('workspace validation libs', () => {
  it('validateWorkspaceLogoUpload rejects oversize logo', () => {
    expect(
      validateWorkspaceLogoUpload({ logoBase64: 'abc', sizeBytes: 3 * 1024 * 1024 }).ok,
    ).toBe(false);
  });

  it('validateWorkspaceDeleteConfirmation matches org name', () => {
    expect(validateWorkspaceDeleteConfirmation('Acme', 'Acme').ok).toBe(true);
    expect(validateWorkspaceDeleteConfirmation('Wrong', 'Acme').ok).toBe(false);
  });

  it('parseWorkspaceAction accepts known actions', () => {
    expect(parseWorkspaceAction('logo')).toBe('logo');
    expect(parseWorkspaceAction('unknown')).toBeNull();
  });

  it('computeDeletionScheduleDate is 48h ahead', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(computeDeletionScheduleDate(now)).toBe('2026-01-03T00:00:00.000Z');
  });
});

describe('notification preferences schema', () => {
  it('accepts valid digest mode', () => {
    const parsed = notificationPreferencesSchema.safeParse({
      emailDigestMode: 'DAILY_DIGEST',
      emailAlertMinAmount: 100,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid categories', () => {
    const parsed = notificationPreferencesSchema.safeParse({
      emailAlertCategories: ['NOT_A_REAL_CATEGORY'],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('security settings libs', () => {
  it('buildSecuritySettingsUpdate coerces booleans', () => {
    expect(buildSecuritySettingsUpdate({ ssoEnabled: 1, twoFaRequired: 0 }).ssoEnabled).toBe(true);
  });

  it('shouldInvalidateSessionsOnSsoEnable only on transition to enabled', () => {
    expect(
      shouldInvalidateSessionsOnSsoEnable(DEFAULT_SECURITY_SETTINGS, {
        ...DEFAULT_SECURITY_SETTINGS,
        ssoEnabled: true,
      }),
    ).toBe(true);
    expect(
      shouldInvalidateSessionsOnSsoEnable(
        { ...DEFAULT_SECURITY_SETTINGS, ssoEnabled: true },
        { ...DEFAULT_SECURITY_SETTINGS, ssoEnabled: true },
      ),
    ).toBe(false);
  });
});
