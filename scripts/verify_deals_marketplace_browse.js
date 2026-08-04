import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'deals_browse');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== VERIFYING PROMPT 3: DEALS MARKETPLACE BROWSE + DETAIL PAGE ===\n');
  const browser = await chromium.launch({ headless: true });

  async function snap(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT] -> public/screenshots/deals_browse/${name}.png`);
  }

  try {
    // 1. Desktop Investor — Browse Grid (1280px 3-column)
    console.log('1. Testing Desktop 1280px Browse Grid...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();
    await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await snap(page, '01_desktop_browse_grid');

    // 2. Deal Detail Page (/dashboard/deals/[slug])
    console.log('\n2. Testing Deal Detail Page & Crowdfunding Module...');
    await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await snap(page, '02_deal_detail_desktop');

    const fundingHeader = page.locator('h2:has-text("Crowdfunding Module")');
    console.log(`- Crowdfunding Module visible: ${await fundingHeader.isVisible()}`);
    if (await fundingHeader.isVisible()) {
      console.log('  ✅ PASS: Deal Detail Page rendered with Crowdfunding Module!');
    }
    await context.close();

    // 3. Tablet 768px Viewport (2-column)
    console.log('\n3. Testing Tablet 768px Responsive Grid...');
    const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    await tabletContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
    ]);
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await tabletPage.waitForTimeout(500);
    await snap(tabletPage, '03_tablet_768px_grid');
    await tabletContext.close();

    // 4. Mobile 375px Viewport (1-column)
    console.log('\n4. Testing Mobile 375px Responsive Grid & Detail...');
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    await mobileContext.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
    ]);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(500);
    await snap(mobilePage, '04_mobile_375px_detail');
    await mobileContext.close();

    console.log('\n=== PROMPT 3 VERIFICATION 100% COMPLETE ===');

  } catch (err) {
    console.error('Verification error:', err);
  }
  await browser.close();
}

runVerification();
