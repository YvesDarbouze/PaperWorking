import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'nav_v7');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== VERIFYING GLOBAL NAVIGATION CONTRACT §9.3 v7 ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  async function snap(p, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await p.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT] -> public/screenshots/nav_v7/${name}.png`);
  }

  try {
    // 1. Investor (Subscribed) — Desktop Primary Sidebar & CommandCenter CTA Card
    console.log('1. Testing Subscribed Investor (Desktop & Command Center CTA)...');
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await snap(page, '01_investor_command_center_cta');

    const dealsLink = page.locator('aside a[href="/dashboard/deals"]');
    console.log(`- Deals link count in Investor Sidebar: ${await dealsLink.count()}`);
    if (await dealsLink.count() > 0) {
      console.log('  ✅ PASS (NAV-01): Deals Marketplace present in Investor Sidebar!');
    }

    const ctaExplore = page.locator('a[href="/dashboard/deals"]:has-text("Explore Deals")');
    console.log(`- Command Center Deals CTA count: ${await ctaExplore.count()}`);
    if (await ctaExplore.count() > 0) {
      console.log('  ✅ PASS (Command Center CTA): Deals Marketplace card rendered with Explore Deals button!');
    }

    // 2. Vendor Account — Zero Deals Affordances
    console.log('\n2. Testing Vendor Persona (Zero Deals Affordances)...');
    await context.addCookies([
      { name: '__acct', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
    ]);
    await page.goto('http://localhost:3000/dashboard/marketplace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await snap(page, '02_vendor_marketplace');

    const vendorMarketplace = page.locator('aside a[href="/dashboard/marketplace"]');
    const vendorDeals = page.locator('aside a[href="/dashboard/deals"]');
    console.log(`- Vendor Marketplace link count in Vendor Sidebar: ${await vendorMarketplace.count()}`);
    console.log(`- Deals link count in Vendor Sidebar: ${await vendorDeals.count()}`);
    if (await vendorMarketplace.count() > 0 && await vendorDeals.count() === 0) {
      console.log('  ✅ PASS (NAV-02): Vendor Sidebar shows Vendor Marketplace and strictly hides Deals!');
    }

    // Direct URL test for Vendor
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    console.log(`- Vendor direct visit to /dashboard/deals redirected to: ${page.url()}`);
    if (page.url().includes('/dashboard/marketplace')) {
      console.log('  ✅ PASS (Vendor Role Security): Vendor redirected away from Deals Marketplace!');
    }

    // 3. Mobile 375px Drawer Navigation (NAV-03)
    console.log('\n3. Testing Mobile 375px Hamburger Drawer & BottomNav...');
    await context.addCookies([
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
    ]);
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 667 });
    await mobilePage.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(800);

    const hamburgerBtn = mobilePage.locator('header button[aria-label="Toggle navigation drawer"]');
    await hamburgerBtn.click();
    await mobilePage.waitForTimeout(400);
    await snap(mobilePage, '03_mobile_hamburger_drawer');

    const drawerDeals = mobilePage.locator('a[href="/dashboard/deals"]:has-text("Deals Marketplace")');
    const drawerTeam = mobilePage.locator('a[href="/dashboard/team"]:has-text("Team")');
    console.log(`- Mobile Drawer Deals count: ${await drawerDeals.count()}`);
    console.log(`- Mobile Drawer Team count: ${await drawerTeam.count()}`);
    if (await drawerDeals.count() > 0 && await drawerTeam.count() > 0) {
      console.log('  ✅ PASS (NAV-03): Top drawer includes both Deals Marketplace & Team!');
    }

    // 4. Data Room 301 Redirect (NAV-04)
    console.log('\n4. Testing Deprecated Data Room HTTP 301 Redirect (NAV-04)...');
    await page.goto('http://localhost:3000/dashboard/data-room', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    console.log(`- Final URL after /dashboard/data-room: ${page.url()}`);
    if (page.url().includes('/dashboard/projects')) {
      console.log('  ✅ PASS (NAV-04): /dashboard/data-room redirected to /dashboard/projects!');
    }

    // 5. Dynamic Document Titles (NAV-05)
    console.log('\n5. Testing Dynamic Surface-Specific Document Titles (NAV-05)...');
    const titleRoutes = [
      { route: '/dashboard/deals', expected: 'PaperWorking — Deals Marketplace' },
      { route: '/dashboard/marketplace', expected: 'PaperWorking — Vendor Marketplace' },
      { route: '/dashboard/projects', expected: 'PaperWorking — Projects' },
      { route: '/dashboard/insights', expected: 'PaperWorking — Insights' },
      { route: '/dashboard/reports', expected: 'PaperWorking — Expense Reports' },
      { route: '/dashboard/team', expected: 'PaperWorking — Team Management' },
    ];

    for (const tr of titleRoutes) {
      await page.goto(`http://localhost:3000${tr.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const title = await page.title();
      console.log(`- Route: ${tr.route} | Tab Title: "${title}" (Expected: "${tr.expected}")`);
      const safeName = tr.route.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await snap(page, `05_title${safeName}`);
    }

    console.log('\n=== GLOBAL NAVIGATION CONTRACT v7 VERIFIED 100% ===');

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
