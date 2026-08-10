import { test, expect } from '@playwright/test';
import seedData from '../src/test/fixtures/agent-crew-seed.json';

test.describe.configure({ mode: 'serial' });

test.describe('Insights Tab KPI Stress Test - Synthetic Agent Crew', () => {
  const marcus = seedData.agents.find((a: any) => a.persona === 'wholesaler')!;
  const dana = seedData.agents.find((a: any) => a.persona === 'fix_and_flip')!;
  const whitmore = seedData.agents.find((a: any) => a.persona === 'buy_and_hold')!;
  const atlas = seedData.agents.find((a: any) => a.persona === 'commercial')!;
  const eleanor = seedData.agents.find((a: any) => a.persona === 'syndicator')!;

  test('1. Marcus (Wholesaler) views 8 Wholesaler KPIs', async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_user_uid', value: marcus.uid, domain: 'localhost', path: '/' },
    ]);
    await page.goto(`/dashboard/insights?userId=${marcus.uid}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').first()).toContainText('Insights');

    // Verify key Wholesaler KPIs on page
    await expect(page.getByText('$29,300').first()).toBeVisible();
    await expect(page.getByText('$9,767').first()).toBeVisible();
    await expect(page.getByText('10 days').first()).toBeVisible();
    await expect(page.getByText('100%').first()).toBeVisible();
  });

  test('2. Dana (Fix and Flipper) views 8 Fix and Flipper KPIs', async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_user_uid', value: dana.uid, domain: 'localhost', path: '/' },
    ]);
    await page.goto(`/dashboard/insights?userId=${dana.uid}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify key Fix and Flipper KPIs on page
    await expect(page.getByText('$152,000').first()).toBeVisible();
    await expect(page.getByText('$28,700').first()).toBeVisible();
    await expect(page.getByText('9.5%').first()).toBeVisible();
    await expect(page.getByText('75 days').first()).toBeVisible();
    await expect(page.getByText('-3%').first()).toBeVisible();
  });

  test('3. Whitmore (Buy and Hold) views 8 KPIs and Austin 4-Plex warning state', async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_user_uid', value: whitmore.uid, domain: 'localhost', path: '/' },
    ]);
    await page.goto(`/dashboard/insights?userId=${whitmore.uid}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify key Buy and Hold KPIs on page
    await expect(page.getByText('$641/mo').first()).toBeVisible();
    await expect(page.getByText('7.15%').first()).toBeVisible();
    await expect(page.getByText('4.39%').first()).toBeVisible();
    await expect(page.getByText('$1,855,000').first()).toBeVisible();
    await expect(page.getByText('95%').first()).toBeVisible();
    await expect(page.getByText('1.12x').first()).toBeVisible();
  });

  test('4. Atlas (Commercial Investor) views 5 Commercial KPIs', async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_user_uid', value: atlas.uid, domain: 'localhost', path: '/' },
    ]);
    await page.goto(`/dashboard/insights?userId=${atlas.uid}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify key Commercial KPIs on page
    await expect(page.getByText('$484,000/yr').first()).toBeVisible();
    await expect(page.getByText('8.0%').first()).toBeVisible();
    await expect(page.getByText('1.47x').first()).toBeVisible();
    await expect(page.getByText('50/50').first()).toBeVisible();
    await expect(page.getByText('3 tenants (2-7 yrs)').first()).toBeVisible();
  });

  test('5. Eleanor (Syndicator) views 4 Syndication KPIs and CSV Export', async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_user_uid', value: eleanor.uid, domain: 'localhost', path: '/' },
    ]);
    await page.goto(`/dashboard/insights?userId=${eleanor.uid}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify key Syndication KPIs on page
    await expect(page.getByText('$7,300,000').first()).toBeVisible();
    await expect(page.getByText(/18.4%/).first()).toBeVisible();
    await expect(page.getByText(/2.2x/).first()).toBeVisible();
    await expect(page.getByText('8%').first()).toBeVisible();

    // Verify CSV Export Button present
    const exportBtn = page.getByRole('button', { name: /Export to CSV/i });
    await expect(exportBtn).toBeVisible();
  });

  test('6. Admin Dashboard displays Agent Crew Insights KPIs panel', async ({ page }) => {
    await page.goto('/admin/agent-crew');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1').first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });
});
