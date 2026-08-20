import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

test.describe('Migration E2E — workspace surfaces (Phase 7c)', () => {
  test('vendor portal quote inbox loads for vendor session', async ({ page, context }) => {
    await createDevSessionForContext(context, 'vendor');
    await page.goto('/vendor-portal');
    await expect(page.getByRole('heading', { name: 'Quote inbox' })).toBeVisible();
  });

  test('project scorecard renders for authenticated investor', async ({ page, context }) => {
    await createDevSessionForContext(context, 'investor');
    await page.goto('/project/deal-1/scorecard');
    await expect(page.getByRole('heading', { name: 'Canonical metric snapshot' })).toBeVisible();
  });

  test('project documents vault lists seed files', async ({ page, context }) => {
    await createDevSessionForContext(context, 'investor');
    await page.goto('/project/deal-1/documents');
    await expect(page.getByRole('heading', { name: 'Document vault' })).toBeVisible();
    await expect(page.getByText('Bank_Statement_POF.pdf')).toBeVisible();
  });

  test('GET /api/health returns healthy migration stack', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.app).toBe('PaperWorking Migration');
    expect(body.services.database.status).toBe('healthy');
  });
});
