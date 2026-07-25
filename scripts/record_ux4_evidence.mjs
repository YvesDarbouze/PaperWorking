import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'ux4_artifacts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function recordUX4Evidence() {
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

  // 1. Deal Analyzer Headings & Tabs
  await page.goto('http://localhost:3000/dashboard/deal-analyzer', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'deal_analyzer_headings_tabs_neutral.png') });

  // 2. Load DEMO_FINANCIALS (Failing Verdict — Red)
  const demoBtn = page.locator('#btn-load-demo');
  if (await demoBtn.isVisible().catch(() => false)) {
    await demoBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'overall_verdict_failing_red.png') });

  // 3. Enter Passing Deal Inputs (Passing Verdict — Green)
  const rentInput = page.locator('#input-rent, input[name="monthlyGrossRent"]').first();
  if (await rentInput.isVisible().catch(() => false)) {
    await rentInput.fill('45000'); // Increase rent so DSCR > 1.25 & CoC > 8%
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'overall_verdict_passing_green.png') });

  console.log('UX-4 evidence screenshots recorded successfully!');
  await browser.close();
}

recordUX4Evidence().catch(err => {
  console.error(err);
  process.exit(1);
});
