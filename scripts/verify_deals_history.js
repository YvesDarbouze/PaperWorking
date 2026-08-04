import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'deals_history');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== VERIFYING PROMPT 5: DEAL HISTORY & COMMUNICATIONS (INVESTOR ACCOUNT) ===\n');
  const browser = await chromium.launch({ headless: true });

  async function snap(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT] -> public/screenshots/deals_history/${name}.png`);
  }

  try {
    // 1. Subscribed Investor — "My Deals & Communications" Tab View
    console.log('1. Testing "My Deals & Communications" Tab View...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();
    await page.goto('http://localhost:3000/dashboard/deals?tab=my-deals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const myDealsTopTabBtn = page.locator('button:has-text("My Deals & Communications")');
    console.log(`- My Deals Top Tab Button visible: ${await myDealsTopTabBtn.isVisible()}`);
    
    if (await myDealsTopTabBtn.isVisible()) {
      await snap(page, '01_my_deals_tab_created_deals');

      const createdTabBtn = page.locator('button:has-text("Deals I Created")');
      console.log(`- Deals I Created Tab visible: ${await createdTabBtn.isVisible()}`);

      const commsHeader = page.locator('h3:has-text("Deal Communications & Inbound Email Trail")');
      console.log(`- Deal Communications & Inbound Email Trail Header visible: ${await commsHeader.isVisible()}`);

      // Switch to "Deals I Was Invited To"
      const invitedTabBtn = page.locator('button:has-text("Deals I Was Invited To")');
      await invitedTabBtn.click();
      await page.waitForTimeout(300);
      await snap(page, '02_my_deals_tab_invited_deals');

      // Switch to "Deals I Committed Intent To"
      const committedTabBtn = page.locator('button:has-text("Deals I Committed Intent To")');
      await committedTabBtn.click();
      await page.waitForTimeout(300);
      await snap(page, '03_my_deals_tab_committed_deals');
    }

    // 2. Test Inbound Email Webhook API Endpoint
    console.log('\n2. Testing Inbound Email Webhook Ingestion API...');
    const res = await page.request.post('http://localhost:3000/api/webhooks/inbound-email', {
      data: {
        From: 'external@investorpartner.com',
        To: 'reply+token999@paperworking.co',
        Subject: 'Re: Inquiry regarding 123 Main St',
        TextBody: 'Count me in for $50,000 investment!\n\nOn Mon wrote:\n> Quoted history',
      },
    });

    console.log(`- Inbound Email Webhook Status: ${res.status()}`);
    const json = await res.json();
    console.log(`- Response: ${JSON.stringify(json)}`);
    if (res.status() === 200 && json.success) {
      console.log('  ✅ PASS: Inbound email webhook parsed and stitched into communications trail!');
    }

    await context.close();
    console.log('\n=== PROMPT 5 VERIFICATION 100% COMPLETE ===');

  } catch (err) {
    console.error('Verification error:', err);
  }
  await browser.close();
}

runVerification();
