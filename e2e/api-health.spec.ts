import { test, expect } from '@playwright/test';

test.describe('Agent 8: API Integration & Health Check E2E', () => {
  test('GET /api/health returns healthy status for DB, Stripe, Plaid, and Storage', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.app).toBe('PaperWorking');
    expect(json.services.database.status).toBe('healthy');
    expect(json.services.stripe.status).toBe('healthy');
    expect(json.services.plaid.status).toBe('healthy');
    expect(json.services.storage.status).toBe('healthy');
    expect(json.timestamp).toBeDefined();
  });
});
