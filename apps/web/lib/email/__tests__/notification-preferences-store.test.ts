/**
 * Notification preferences store tests.
 *
 * The Firebase Admin module is mocked so both persistence paths can be
 * exercised: the Firestore user-document path (defaults created on first
 * access, merge updates, defensive coercion) and the in-memory fallback used
 * by tests/CI when `shouldAttemptFirestore()` is false.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const firestoreState = new Map<string, Record<string, unknown>>();

const shouldAttemptFirestoreMock = jest.fn<() => boolean>(() => false);

const getAdminFirestoreMock = jest.fn(() => ({
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const value = firestoreState.get(`${name}/${id}`);
        return { exists: value !== undefined, data: () => value };
      },
      set: async (data: Record<string, unknown>) => {
        const key = `${name}/${id}`;
        firestoreState.set(key, { ...(firestoreState.get(key) ?? {}), ...data });
      },
    }),
  }),
}));

jest.unstable_mockModule('@/lib/firebase/admin', () => ({
  shouldAttemptFirestore: shouldAttemptFirestoreMock,
  getAdminFirestore: getAdminFirestoreMock,
}));

const {
  DEFAULT_ALERT_CATEGORIES,
  NOTIFICATION_ALERT_CATEGORIES,
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
  __resetNotificationPreferencesForTesting,
} = await import('@/lib/email/notification-preferences-store');

function storedPreferences(uid: string): Record<string, unknown> | undefined {
  const doc = firestoreState.get(`users/${uid}`);
  const preferences = doc?.notificationPreferences;
  return typeof preferences === 'object' && preferences !== null
    ? (preferences as Record<string, unknown>)
    : undefined;
}

beforeEach(() => {
  __resetNotificationPreferencesForTesting();
  firestoreState.clear();
  shouldAttemptFirestoreMock.mockReset();
  shouldAttemptFirestoreMock.mockReturnValue(false);
  getAdminFirestoreMock.mockClear();
});

describe('default preferences', () => {
  it('enables every alert category by default', () => {
    expect(DEFAULT_ALERT_CATEGORIES).toEqual([...NOTIFICATION_ALERT_CATEGORIES]);
    expect(DEFAULT_ALERT_CATEGORIES.length).toBeGreaterThan(0);
    expect(DEFAULT_ALERT_CATEGORIES).toContain('RENT_INCOME');
    expect(DEFAULT_ALERT_CATEGORIES).toContain('PROPERTY_TAX');
  });

  it('creates defaults on first access (in-memory fallback)', async () => {
    const preferences = await getOrCreateNotificationPreferences('uid-memory-1');

    expect(preferences).toMatchObject({
      emailTransactionAlerts: true,
      emailAlertMinAmount: 0,
      emailDigestMode: 'IMMEDIATE',
      emailAlertThreshold: 'ALL',
    });
    expect(preferences.emailAlertCategories).toEqual([...DEFAULT_ALERT_CATEGORIES]);
    expect(preferences.updatedAt).toEqual(expect.any(String));
    expect(getAdminFirestoreMock).not.toHaveBeenCalled();
  });

  it('returns the same cached preferences on subsequent reads', async () => {
    const first = await getOrCreateNotificationPreferences('uid-memory-2');
    const second = await getOrCreateNotificationPreferences('uid-memory-2');
    expect(second).toEqual(first);
  });
});

describe('updateNotificationPreferences (in-memory fallback)', () => {
  it('merges updates without clobbering untouched fields', async () => {
    await updateNotificationPreferences('uid-memory-3', {
      emailDigestMode: 'DAILY_DIGEST',
      emailAlertMinAmount: 250,
    });

    const preferences = await getOrCreateNotificationPreferences('uid-memory-3');
    expect(preferences.emailDigestMode).toBe('DAILY_DIGEST');
    expect(preferences.emailAlertMinAmount).toBe(250);
    expect(preferences.emailTransactionAlerts).toBe(true);
    expect(preferences.emailAlertThreshold).toBe('ALL');
    expect(preferences.emailAlertCategories).toEqual([...DEFAULT_ALERT_CATEGORIES]);
  });

  it('persists opt-out and category narrowing', async () => {
    await updateNotificationPreferences('uid-memory-4', {
      emailTransactionAlerts: false,
      emailAlertCategories: ['RENT_INCOME'],
    });

    const preferences = await getOrCreateNotificationPreferences('uid-memory-4');
    expect(preferences.emailTransactionAlerts).toBe(false);
    expect(preferences.emailAlertCategories).toEqual(['RENT_INCOME']);
  });
});

describe('Firestore persistence', () => {
  it('creates defaults on the user document when none exist', async () => {
    shouldAttemptFirestoreMock.mockReturnValue(true);

    const preferences = await getOrCreateNotificationPreferences('uid-fs-1');

    expect(preferences.emailDigestMode).toBe('IMMEDIATE');
    const stored = storedPreferences('uid-fs-1');
    expect(stored).toMatchObject({
      emailTransactionAlerts: true,
      emailAlertMinAmount: 0,
      emailDigestMode: 'IMMEDIATE',
      emailAlertThreshold: 'ALL',
    });
    expect(stored?.emailAlertCategories).toEqual([...DEFAULT_ALERT_CATEGORIES]);
  });

  it('reads existing stored preferences', async () => {
    shouldAttemptFirestoreMock.mockReturnValue(true);
    firestoreState.set('users/uid-fs-2', {
      notificationPreferences: {
        emailTransactionAlerts: false,
        emailAlertCategories: ['PROPERTY_TAX'],
        emailAlertMinAmount: 99,
        emailDigestMode: 'HOURLY_BATCH',
        emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const preferences = await getOrCreateNotificationPreferences('uid-fs-2');

    expect(preferences).toEqual({
      emailTransactionAlerts: false,
      emailAlertCategories: ['PROPERTY_TAX'],
      emailAlertMinAmount: 99,
      emailDigestMode: 'HOURLY_BATCH',
      emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('persists updates to the user document', async () => {
    shouldAttemptFirestoreMock.mockReturnValue(true);

    await updateNotificationPreferences('uid-fs-3', { emailDigestMode: 'DAILY_DIGEST' });

    const stored = storedPreferences('uid-fs-3');
    expect(stored).toMatchObject({
      emailTransactionAlerts: true,
      emailDigestMode: 'DAILY_DIGEST',
      emailAlertThreshold: 'ALL',
    });
  });

  it('coerces corrupt stored values back to safe defaults', async () => {
    shouldAttemptFirestoreMock.mockReturnValue(true);
    firestoreState.set('users/uid-fs-4', {
      notificationPreferences: {
        emailTransactionAlerts: 'yes',
        emailAlertCategories: ['RENT_INCOME', 42],
        emailAlertMinAmount: -5,
        emailDigestMode: 'BOGUS',
        emailAlertThreshold: 'SOMETIMES',
      },
    });

    const preferences = await getOrCreateNotificationPreferences('uid-fs-4');

    expect(preferences.emailTransactionAlerts).toBe(true);
    expect(preferences.emailAlertCategories).toEqual(['RENT_INCOME']);
    expect(preferences.emailAlertMinAmount).toBe(0);
    expect(preferences.emailDigestMode).toBe('IMMEDIATE');
    expect(preferences.emailAlertThreshold).toBe('ALL');
  });

  it('falls back to memory when Firestore reads fail', async () => {
    shouldAttemptFirestoreMock.mockReturnValue(true);
    getAdminFirestoreMock.mockImplementationOnce(() => {
      throw new Error('firestore unavailable');
    });

    const preferences = await getOrCreateNotificationPreferences('uid-fs-5');
    expect(preferences.emailDigestMode).toBe('IMMEDIATE');
  });
});
