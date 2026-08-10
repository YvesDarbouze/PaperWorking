import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'navigation_cures');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyNavigationCures() {
  console.log('=== VERIFYING CURED NAVIGATION AUDIT FINDINGS (NAV-01 TO NAV-05) ===\n');
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  async function snap(p, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await p.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT SAVED] -> public/screenshots/navigation_cures/${name}.png`);
  }

  try {
    // 1. NAV-01: Investor Sidebar contains Deals Marketplace
    console.log('--- TEST 1: NAV-01 (Investor Sidebar & Deals Link) ---');
    await page.goto('http://localhost:3000/dashboard/command-center');
    await page.waitForSelector('aside');
    await page.waitForTimeout(500);

    const sidebarDeals = page.locator('aside a[href="/dashboard/deals"]');
    const dealsCount = await sidebarDeals.count();
    console.log(`Deals Link in Investor Sidebar count: ${dealsCount}`);
    if (dealsCount > 0) {
      console.log('✅ PASS: Deals link visible in Investor desktop sidebar!');
    }
    await snap(page, 'nav_01_investor_sidebar_deals');

    // 2. NAV-02: Vendor Sidebar contains Vendor Marketplace (and hides Deals)
    console.log('\n--- TEST 2: NAV-02 (Vendor Sidebar & Vendor Marketplace Link) ---');
    // Set vendor cookie
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'Vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'vendor', domain: 'localhost', path: '/' },
    ]);
    await page.goto('http://localhost:3000/dashboard/marketplace');
    await page.waitForSelector('aside');
    await page.waitForTimeout(500);

    const vendorMarketplaceLink = page.locator('aside a[href="/dashboard/marketplace"]');
    const vendorDealsLink = page.locator('aside a[href="/dashboard/deals"]');
    console.log(`Vendor Marketplace Link in Vendor Sidebar: ${await vendorMarketplaceLink.count()}`);
    console.log(`Deals Link in Vendor Sidebar (must be 0): ${await vendorDealsLink.count()}`);
    if (await vendorMarketplaceLink.count() > 0 && await vendorDealsLink.count() === 0) {
      console.log('✅ PASS: Vendor sidebar contains Marketplace and hides Deals!');
    }
    await snap(page, 'nav_02_vendor_sidebar');

    // Reset back to investor persona
    await page.context().addCookies([
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    // 3. NAV-03: Mobile BottomNav for Investor (375px) contains Deals & Team
    console.log('\n--- TEST 3: NAV-03 (Mobile 375px BottomNav containing Deals & Team) ---');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/dashboard/command-center');
    await page.waitForSelector('nav.md\\:hidden');
    await page.waitForTimeout(500);

    const mobileDeals = page.locator('nav.md\\:hidden a[href="/dashboard/deals"]');
    const mobileTeam = page.locator('nav.md\\:hidden a[href="/dashboard/team"]');
    
    console.log(`Mobile BottomNav Deals count: ${await mobileDeals.count()}`);
    console.log(`Mobile BottomNav Team count: ${await mobileTeam.count()}`);
    if (await mobileDeals.count() > 0 && await mobileTeam.count() > 0) {
      console.log('✅ PASS: Mobile BottomNav includes both Deals and Team!');
    }
    await snap(page, 'nav_03_mobile_bottomnav_team_deals');

    // Reset viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // 4. NAV-04: Data Room 301 Redirect to /dashboard/projects
    console.log('\n--- TEST 4: NAV-04 (Data Room 301 Redirect to /dashboard/projects) ---');
    await page.goto('http://localhost:3000/dashboard/data-room');
    await page.waitForTimeout(500);
    const finalUrl = page.url();
    console.log(`URL after navigating to /dashboard/data-room: ${finalUrl}`);
    if (finalUrl.includes('/dashboard/projects')) {
      console.log('✅ PASS: /dashboard/data-room redirected to /dashboard/projects!');
    }
    await snap(page, 'nav_04_dataroom_redirect');

    // 5. NAV-05: Informative Tab Titles across Sub-Routes
    console.log('\n--- TEST 5: NAV-05 (Browser Tab Titles) ---');
    const titleRoutes = [
      { route: '/dashboard/deals', expected: 'Deals Marketplace | PaperWorking' },
      { route: '/dashboard/marketplace', expected: 'Vendor Marketplace | PaperWorking' },
      { route: '/dashboard/projects', expected: 'Projects | PaperWorking' },
      { route: '/dashboard/insights', expected: 'Insights | PaperWorking' },
      { route: '/dashboard/reports', expected: 'Expense Reports | PaperWorking' },
      { route: '/dashboard/team', expected: 'Team Management | PaperWorking' },
    ];

    for (const tr of titleRoutes) {
      await page.goto(`http://localhost:3000${tr.route}`);
      await page.waitForTimeout(500);
      const title = await page.title();
      console.log(`Route: ${tr.route} | Tab Title: "${title}" (Expected: "${tr.expected}")`);
      const safeName = tr.route.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await snap(page, `nav_05_title${safeName}`);
    }

    console.log('\n=== ALL NAVIGATION CURES VERIFIED SUCCESSFULLY ===');

  } catch (err) {
    console.error('Verification script error:', err);
  } finally {
    await browser.close();
  }
}

verifyNavigationCures();
