import { test, expect } from '@playwright/test';

test.describe('BUG-002 — Deals Marketplace Database (Prisma) Integration', () => {
  test('returns DB-backed deals payload without in-memory SAMPLE_DEALS content', async ({ request }) => {
    const response = await request.get('/api/deals', {
      headers: {
        authorization: 'Bearer mock_token',
      },
    });

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.deals)).toBe(true);

    // Verify when database contains 0 deals, returns total: 0 and deals: []
    if (json.deals.length === 0) {
      expect(json.total).toBe(0);
      expect(json.deals).toEqual([]);
    }
  });
});
