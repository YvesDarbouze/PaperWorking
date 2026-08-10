import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'reachability_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runFastAudit() {
  console.log('=== FAST REACHABILITY & WAYFINDING AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  async function snap(name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SAVED] -> ${name}.png`);
  }

  const routes = [
    { surface: 'Portfolio Command Center', route: '/dashboard/command-center', inSidebar: true, clicks: 1 },
    { surface: 'Projects', route: '/dashboard/projects', inSidebar: true, clicks: 1 },
    { surface: 'Insights', route: '/dashboard/insights', inSidebar: true, clicks: 1 },
    { surface: 'Reports', route: '/dashboard/reports', inSidebar: true, clicks: 1 },
    { surface: 'Inbox (Messages)', route: '/dashboard/inbox', inSidebar: true, clicks: 1 },
    { surface: 'Team', route: '/dashboard/team', inSidebar: true, clicks: 1 },
    { surface: 'Profile', route: '/dashboard/settings/profile', inSidebar: true, clicks: 1 },
    { surface: 'Billing', route: '/dashboard/settings/billing', inSidebar: true, clicks: 1 },
    { surface: 'Settings', route: '/dashboard/settings', inSidebar: true, clicks: 1 },
    { surface: 'Deals Marketplace', route: '/dashboard/deals', inSidebar: false, clicks: 'Direct URL / Search (Orphan)' },
    { surface: 'Vendor Marketplace', route: '/dashboard/marketplace', inSidebar: false, clicks: 'Direct URL / Search (Orphan)' },
    { surface: 'Deal Analyzer', route: '/dashboard/deal-analyzer', inSidebar: false, clicks: 'Direct URL / Search (Orphan)' },
    { surface: 'Tax Hub', route: '/dashboard/tax', inSidebar: false, clicks: 'Direct URL / Search (Orphan)' },
    { surface: 'Intelligence Hub', route: '/dashboard/intelligence', inSidebar: false, clicks: 'Direct URL / Search (Orphan)' },
    { surface: 'Data Room', route: '/dashboard/data-room', inSidebar: false, clicks: 'Removed / Phase-Scoped (Orphan)' },
  ];

  try {
    for (const r of routes) {
      console.log(`Testing route: ${r.route}...`);
      await page.goto(`http://localhost:3000${r.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const title = await page.title();
      const safeName = r.surface.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await snap(`desktop_${safeName}`);
      console.log(`Surface: ${r.surface} | Route: ${r.route} | Tab Title: "${title}"`);
    }

    // 404 test
    console.log('\nTesting 404 page...');
    await page.goto('http://localhost:3000/non-existent-page-xyz', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const title404 = await page.title();
    await snap('desktop_404_not_found');
    console.log(`404 Route Tab Title: "${title404}"`);

    // Mobile 375px test
    console.log('\nTesting Mobile 375px Viewport...');
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await mobilePage.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_375px_bottom_nav.png') });
    console.log('[SAVED] -> mobile_375px_bottom_nav.png');

    await mobilePage.close();
    console.log('\n=== AUDIT COMPLETE ===');

  } catch (err) {
    console.error('Audit script error:', err);
  } finally {
    await browser.close();
  }
}

runFastAudit();
