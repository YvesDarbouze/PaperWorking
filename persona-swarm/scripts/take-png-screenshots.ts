import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function captureScreenshots() {
  const baseURL = process.env.PERSONA_SWARM_BASE_URL || 'http://localhost:3000';
  const shotsDir = path.join(process.cwd(), 'artifacts', 'persona-swarm', 'shots', 'P-01');

  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const routes = [
    { route: '/dashboard/settings/profile', file: '01-signup-onboarding.png' },
    { route: '/dashboard/settings/billing', file: '02-stripe-billing-checkout.png' },
    { route: '/dashboard/command-center', file: '03-portfolio-command-center.png' },
    { route: '/dashboard/insights', file: '04-insights-kpi-analytics.png' },
    { route: '/dashboard/projects', file: '05-phase-gate-override.png' },
    { route: '/dashboard/inbox', file: '06-team-collaboration-inbox.png' },
  ];

  for (const { route, file } of routes) {
    const outPath = path.join(shotsDir, file);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50000) {
      console.log(`Skipping ${file} (already captured, size ${fs.statSync(outPath).size} bytes)`);
      continue;
    }
    console.log(`Navigating to ${route}...`);
    try {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Captured ${file} (${fs.statSync(outPath).size} bytes)`);
    } catch (err) {
      console.error(`Failed to capture ${route}:`, err);
    }
  }

  await browser.close();
  console.log('Finished capturing all PNG screenshots.');
}

captureScreenshots().catch(console.error);
