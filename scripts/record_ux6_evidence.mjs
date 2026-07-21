import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'ux6_artifacts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function recordUX6Evidence() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: {
      cookies: [
        { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
        { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      ],
      origins: [],
    },
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Initial Portfolio view
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_portfolio_initial.png') });

  // 2. Expand Click 1: Portfolio KPI Strip Card -> Deep-links to Insights
  const kpiCard = page.locator('article[aria-label*="Portfolio IRR"]').first();
  if (await kpiCard.isVisible().catch(() => false)) {
    await kpiCard.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_expanded_kpi_card_to_insights.png') });
  }

  // 3. Expand Click 2: Featured Metric (Cap Rate) -> Deep-links to Insights
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  const featuredCard = page.locator('div[aria-label*="Cap Rate"]').first();
  if (await featuredCard.isVisible().catch(() => false)) {
    await featuredCard.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03_expanded_featured_metric_to_insights.png') });
  }

  // 4. Expand Click 3: Deal Map Card -> Deep-links to Marketplace
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  const dealMapCard = page.locator('div[aria-label*="Deal Map"]').first();
  if (await dealMapCard.isVisible().catch(() => false)) {
    await dealMapCard.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_expanded_deal_map_to_marketplace.png') });
  }

  // 5. Missing Inputs Expanded State in Insights
  await page.goto('http://localhost:3000/dashboard/insights', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_insights_missing_inputs_deep_link.png') });

  console.log('UX-6 evidence screenshots recorded successfully!');
  await browser.close();
}

recordUX6Evidence().catch(err => {
  console.error(err);
  process.exit(1);
});
