import { test, expect } from '@playwright/test';

test.describe('BUG-001 — /api/deals Endpoint Authentication Enforcement', () => {
  test('rejects unauthenticated requests to /api/deals with 401 Unauthorized', async ({ request }) => {
    const response = await request.get('/api/deals');
    expect(response.status()).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
    expect(json.message).toContain('Missing or malformed Authorization header');
  });

  test('allows authenticated requests to /api/deals with valid bearer token', async ({ request }) => {
    const response = await request.get('/api/deals', {
      headers: {
        authorization: 'Bearer mock_token',
      },
    });

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.deals)).toBe(true);
  });
});
