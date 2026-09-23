/**
 * Notification preferences API route tests.
 *
 * Auth resolution and the persistence store are mocked (via the ESM
 * `jest.unstable_mockModule` equivalent of `jest.mock`) so the route's
 * validation, auth gates, and merge wiring can be asserted in isolation.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import type { NotificationPreferences } from '@/lib/email/notification-preferences-store';

const resolveAuthUserFromRequestMock =
  jest.fn<(request: Request) => Promise<AuthUser | null>>();
const getOrCreateNotificationPreferencesMock =
  jest.fn<(uid: string) => Promise<NotificationPreferences>>();
const updateNotificationPreferencesMock =
  jest.fn<(uid: string, updates: unknown) => Promise<NotificationPreferences>>();

jest.unstable_mockModule('@/lib/api/server-session', () => ({
  resolveAuthUserFromRequest: resolveAuthUserFromRequestMock,
}));

jest.unstable_mockModule('@/lib/email/notification-preferences-store', () => ({
  getOrCreateNotificationPreferences: getOrCreateNotificationPreferencesMock,
  updateNotificationPreferences: updateNotificationPreferencesMock,
}));

const { GET, PUT } = await import('@/app/api/user/notification-preferences/route');

const URL = 'http://localhost/api/user/notification-preferences';

const TEST_USER: AuthUser = {
  uid: 'user-prefs-1',
  email: 'prefs@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailTransactionAlerts: true,
  emailAlertCategories: ['RENT_INCOME', 'PROPERTY_TAX'],
  emailAlertMinAmount: 0,
  emailDigestMode: 'IMMEDIATE',
  emailAlertThreshold: 'ALL',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function jsonRequest(method: string, body: string): Request {
  return new Request(URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  resolveAuthUserFromRequestMock.mockReset();
  getOrCreateNotificationPreferencesMock.mockReset();
  updateNotificationPreferencesMock.mockReset();
  resolveAuthUserFromRequestMock.mockResolvedValue(TEST_USER);
  getOrCreateNotificationPreferencesMock.mockResolvedValue(DEFAULT_PREFERENCES);
  updateNotificationPreferencesMock.mockResolvedValue(DEFAULT_PREFERENCES);
});

describe('GET /api/user/notification-preferences', () => {
  it('returns 401 when unauthenticated', async () => {
    resolveAuthUserFromRequestMock.mockResolvedValue(null);

    const response = await GET(new Request(URL));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(getOrCreateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('returns the current preferences, creating defaults on first access', async () => {
    const response = await GET(new Request(URL));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(getOrCreateNotificationPreferencesMock).toHaveBeenCalledWith(TEST_USER.uid);
  });

  it('returns 500 when the preferences store fails', async () => {
    getOrCreateNotificationPreferencesMock.mockRejectedValue(new Error('store offline'));

    const response = await GET(new Request(URL));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('store offline');
  });
});

describe('PUT /api/user/notification-preferences', () => {
  it('returns 401 when unauthenticated', async () => {
    resolveAuthUserFromRequestMock.mockResolvedValue(null);

    const response = await PUT(jsonRequest('PUT', JSON.stringify({ emailTransactionAlerts: false })));

    expect(response.status).toBe(401);
    expect(updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const response = await PUT(jsonRequest('PUT', 'not-json'));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid JSON body');
  });

  it('returns 400 for a negative emailAlertMinAmount', async () => {
    const response = await PUT(jsonRequest('PUT', JSON.stringify({ emailAlertMinAmount: -1 })));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
    expect(updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown digest mode', async () => {
    const response = await PUT(jsonRequest('PUT', JSON.stringify({ emailDigestMode: 'WEEKLY' })));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown alert threshold or non-array categories', async () => {
    const badThreshold = await PUT(
      jsonRequest('PUT', JSON.stringify({ emailAlertThreshold: 'SOMETIMES' })),
    );
    expect(badThreshold.status).toBe(400);

    const badCategories = await PUT(
      jsonRequest('PUT', JSON.stringify({ emailAlertCategories: 'RENT_INCOME' })),
    );
    expect(badCategories.status).toBe(400);
    expect(updateNotificationPreferencesMock).not.toHaveBeenCalled();
  });

  it('merges valid updates and returns the updated preferences', async () => {
    const updated: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      emailTransactionAlerts: false,
      emailDigestMode: 'DAILY_DIGEST',
      emailAlertMinAmount: 500,
      emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
      emailAlertCategories: ['RENT_INCOME'],
    };
    updateNotificationPreferencesMock.mockResolvedValue(updated);

    const response = await PUT(
      jsonRequest(
        'PUT',
        JSON.stringify({
          emailTransactionAlerts: false,
          emailDigestMode: 'DAILY_DIGEST',
          emailAlertMinAmount: 500,
          emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
          emailAlertCategories: ['RENT_INCOME'],
        }),
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.preferences).toEqual(updated);
    expect(updateNotificationPreferencesMock).toHaveBeenCalledWith(TEST_USER.uid, {
      emailTransactionAlerts: false,
      emailDigestMode: 'DAILY_DIGEST',
      emailAlertMinAmount: 500,
      emailAlertThreshold: 'HIGH_CONFIDENCE_ONLY',
      emailAlertCategories: ['RENT_INCOME'],
    });
  });

  it('returns 500 when the preferences store fails', async () => {
    updateNotificationPreferencesMock.mockRejectedValue(new Error('store offline'));

    const response = await PUT(jsonRequest('PUT', JSON.stringify({ emailTransactionAlerts: false })));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('store offline');
  });
});
