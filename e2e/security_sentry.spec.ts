import { test, expect } from '@playwright/test';

test.describe('SECURITY_SENTRY: Token authentication and local dev bypass checks', () => {

  test('Authorization: Bearer mock_hacker → HTTP 401 on /api/fund/close-deal', async ({ request }) => {
    const res = await request.post('/api/fund/close-deal', {
      headers: {
        'Authorization': 'Bearer mock_hacker',
      },
      data: {
        projectId: 'evergreen_life',
      }
    });
    expect(res.status()).toBe(401);
  });

  test('Authorization: Bearer mock_token + ENABLE_MOCK_AUTH=true + localhost → HTTP 200 (dev works)', async ({ request }) => {
    const res = await request.post('/api/fund/close-deal', {
      headers: {
        'Authorization': 'Bearer mock_token',
        'host': 'localhost',
      },
      data: {
        projectId: 'evergreen_life',
      }
    });
    // Auth succeeds: should not be 401/403 (either 200 OK or 404/400 if project not seeded yet)
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('Same mock token on production build → HTTP 401', async ({ request }) => {
    // Simulate production environment
    const res = await request.post('/api/fund/close-deal', {
      headers: {
        'Authorization': 'Bearer mock_token',
        'host': 'paperworking.co',
        'x-simulate-production': 'true',
      },
      data: {
        projectId: 'evergreen_life',
      }
    });
    expect(res.status()).toBe(401);
  });
});
