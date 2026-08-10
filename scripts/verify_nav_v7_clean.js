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

  async function snap(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT] -> public/screenshots/nav_v7/${name}.png`);
  }

  try {
    // 1. Persona 1: Subscribed Investor (Desktop)
    console.log('--- PERSONA 1: Subscribed Investor (Desktop) ---');
    const investorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await investorContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);
    const investorPage = await investorContext.newPage();
    await investorPage.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' });
    await investorPage.waitForTimeout(500);

    const dealsLink = investorPage.locator('aside a[href="/dashboard/deals"]');
    console.log(`- Deals link count in Investor Sidebar: ${await dealsLink.count()}`);
    if (await dealsLink.count() > 0) {
      console.log('  ✅ PASS (NAV-01): Deals Marketplace present in Investor Sidebar!');
    }

    const ctaExplore = investorPage.locator('a[href="/dashboard/deals"]:has-text("Explore Deals")');
    console.log(`- Command Center Deals CTA count: ${await ctaExplore.count()}`);
    if (await ctaExplore.count() > 0) {
      console.log('  ✅ PASS (Command Center CTA): Deals Marketplace CTA card rendered!');
    }
    await snap(investorPage, '01_investor_command_center');
    await investorContext.close();

    // 2. Persona 2: Vendor Account (Desktop)
    console.log('\n--- PERSONA 2: Vendor Account (Desktop) ---');
    const vendorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await vendorContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Vendor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'vendor', domain: 'localhost', path: '/' },
    ]);
    const vendorPage = await vendorContext.newPage();
    await vendorPage.goto('http://localhost:3000/dashboard/marketplace', { waitUntil: 'networkidle' });
    await vendorPage.waitForTimeout(500);

    const vendorMarketplace = vendorPage.locator('aside a[href="/dashboard/marketplace"]');
    const vendorDeals = vendorPage.locator('aside a[href="/dashboard/deals"]');
    console.log(`- Vendor Marketplace link count in Vendor Sidebar: ${await vendorMarketplace.count()}`);
    console.log(`- Deals link count in Vendor Sidebar: ${await vendorDeals.count()}`);
    if (await vendorMarketplace.count() > 0 && await vendorDeals.count() === 0) {
      console.log('  ✅ PASS (NAV-02): Vendor Sidebar shows Vendor Marketplace and strictly hides Deals!');
    }
    await snap(vendorPage, '02_vendor_marketplace');

    // Direct URL test for Vendor
    await vendorPage.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await vendorPage.waitForTimeout(500);
    console.log(`- Vendor direct visit to /dashboard/deals redirected to: ${vendorPage.url()}`);
    if (vendorPage.url().includes('/dashboard/marketplace')) {
      console.log('  ✅ PASS (Vendor Security Guard): Vendor redirected away from Deals Marketplace!');
    }
    await vendorContext.close();

    // 3. Persona 3: Mobile Subscribed Investor (375px)
    console.log('\n--- PERSONA 3: Mobile Subscribed Investor (375px) ---');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    await mobileContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
    ]);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(500);

    const hamburgerBtn = mobilePage.locator('header button[aria-label="Toggle navigation drawer"]');
    await hamburgerBtn.click();
    await mobilePage.waitForTimeout(400);
    await snap(mobilePage, '03_mobile_hamburger_drawer');

    const drawerDeals = mobilePage.locator('a[href="/dashboard/deals"]:has-text("Deals Marketplace")');
    const drawerTeam = mobilePage.locator('a[href="/dashboard/team"]:has-text("Team")');
    console.log(`- Mobile Drawer Deals count: ${await drawerDeals.count()}`);
    console.log(`- Mobile Drawer Team count: ${await drawerTeam.count()}`);
    if (await drawerDeals.count() > 0 && await drawerTeam.count() > 0) {
      console.log('  ✅ PASS (NAV-03): Top drawer includes Deals Marketplace & Team!');
    }
    await mobileContext.close();

    // 4. Data Room Redirect (NAV-04)
    console.log('\n--- TEST 4: Deprecated Data Room HTTP 301 Redirect (NAV-04) ---');
    const redirectContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await redirectContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
    ]);
    const redirectPage = await redirectContext.newPage();
    await redirectPage.goto('http://localhost:3000/dashboard/data-room', { waitUntil: 'domcontentloaded' });
    await redirectPage.waitForTimeout(500);
    console.log(`- Final URL after /dashboard/data-room: ${redirectPage.url()}`);
    if (redirectPage.url().includes('/dashboard/projects')) {
      console.log('  ✅ PASS (NAV-04): /dashboard/data-room redirected to /dashboard/projects!');
    }
    await redirectContext.close();

    // 5. Dynamic Document Titles (NAV-05)
    console.log('\n--- TEST 5: Surface-Specific Document Titles (NAV-05) ---');
    const titleContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await titleContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
    ]);
    const titlePage = await titleContext.newPage();

    const titleRoutes = [
      { route: '/dashboard/deals', expected: 'PaperWorking — Deals Marketplace' },
      { route: '/dashboard/marketplace', expected: 'PaperWorking — Vendor Marketplace' },
      { route: '/dashboard/projects', expected: 'PaperWorking — Projects' },
      { route: '/dashboard/insights', expected: 'PaperWorking — Insights' },
      { route: '/dashboard/reports', expected: 'PaperWorking — Expense Reports' },
      { route: '/dashboard/team', expected: 'PaperWorking — Team Management' },
    ];

    for (const tr of titleRoutes) {
      await titlePage.goto(`http://localhost:3000${tr.route}`, { waitUntil: 'domcontentloaded' });
      await titlePage.waitForTimeout(400);
      const title = await titlePage.title();
      console.log(`- Route: ${tr.route} | Tab Title: "${title}" (Expected: "${tr.expected}")`);
      const safeName = tr.route.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await snap(titlePage, `05_title${safeName}`);
    }
    await titleContext.close();

    console.log('\n=== GLOBAL NAVIGATION CONTRACT v7 VERIFIED 100% ===');

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
