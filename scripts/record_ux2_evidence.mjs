import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'ux2_artifacts');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const prefix = process.argv[2] || 'before'; // 'before' or 'after'

async function recordEvidence() {
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

  const routes = [
    { name: 'portfolio', url: 'http://localhost:3000/dashboard/command-center' },
    { name: 'insights', url: 'http://localhost:3000/dashboard/insights' },
    { name: 'projects', url: 'http://localhost:3000/dashboard/projects' },
    { name: 'marketplace', url: 'http://localhost:3000/dashboard/marketplace' },
  ];

  const viewports = [
    { width: 1440, height: 900, label: '1440px' },
    { width: 1280, height: 800, label: '1280px' },
  ];

  for (const vp of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of routes) {
      await page.goto(route.url, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1000);
      const filename = `${prefix}_${route.name}_${vp.label}.png`;
      await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: false });
      console.log(`Saved screenshot: ${filename}`);
    }
    await page.close();
  }

  // Audit computed styles on Command Center
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const computed = await page.evaluate(() => {
    const bodyEl = document.querySelector('p, span') || document.body;
    const kpiEl = document.querySelector('[class*="text-[32px]"], [class*="text-[28px]"], [class*="font-bold"]') || document.body;
    const labelEl = document.querySelector('label, [class*="text-xs"], [class*="uppercase"]') || document.body;

    return {
      body: {
        fontSize: window.getComputedStyle(bodyEl).fontSize,
        fontWeight: window.getComputedStyle(bodyEl).fontWeight,
        lineHeight: window.getComputedStyle(bodyEl).lineHeight,
      },
      kpi: {
        fontSize: window.getComputedStyle(kpiEl).fontSize,
        fontWeight: window.getComputedStyle(kpiEl).fontWeight,
        lineHeight: window.getComputedStyle(kpiEl).lineHeight,
      },
      label: {
        fontSize: window.getComputedStyle(labelEl).fontSize,
        fontWeight: window.getComputedStyle(labelEl).fontWeight,
        lineHeight: window.getComputedStyle(labelEl).lineHeight,
      },
    };
  });

  console.log(`Computed styles (${prefix}):`, JSON.stringify(computed, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, `${prefix}_computed_styles.json`), JSON.stringify(computed, null, 2));

  await browser.close();
}

recordEvidence().catch(err => {
  console.error(err);
  process.exit(1);
});
