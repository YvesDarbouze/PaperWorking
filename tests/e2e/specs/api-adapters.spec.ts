import { test, expect } from '@playwright/test';
import { createDevSession } from '../helpers/auth.js';

test.describe('Migration E2E — API adapters (Phase 5d–5i)', () => {
  test.beforeEach(async ({ request }) => {
    await createDevSession(request, 'investor');
  });

  test('GET /api/projects returns seed project list', async ({ request }) => {
    const response = await request.get('/api/projects');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.projects.length).toBeGreaterThan(0);
  });

  test('GET /api/portfolio/metrics returns portfolio rollup', async ({ request }) => {
    const response = await request.get('/api/portfolio/metrics?period=overall');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.portfolio.portfolioNoi).toBeGreaterThan(0);
  });

  test('GET /api/insights returns KPI metrics', async ({ request }) => {
    const response = await request.get('/api/insights?userId=dev-user-1');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.metrics).toBeDefined();
  });

  test('GET /api/deals returns marketplace deals', async ({ request }) => {
    const response = await request.get('/api/deals');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.deals)).toBe(true);
  });
});
