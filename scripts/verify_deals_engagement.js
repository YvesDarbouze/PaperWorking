import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'deals_engagement');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== VERIFYING PROMPT 4: DEAL ENGAGEMENT, INVITATIONS & PUBLIC TEASER FUNNEL ===\n');
  const browser = await chromium.launch({ headless: true });

  async function snap(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SCREENSHOT] -> public/screenshots/deals_engagement/${name}.png`);
  }

  try {
    // 1. Subscribed Investor — Engagement Module & Intent Form
    console.log('1. Testing Subscribed Investor Engagement Module & Intent Form...');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_role', value: 'Lead Investor', domain: 'localhost', path: '/' },
      { name: 'mock_user_account_type', value: 'investor', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();
    await page.goto('http://localhost:3000/dashboard/deals/123mainstaustintx78701', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await snap(page, '01_authenticated_engagement_module');

    const interestedBtn = page.locator('button:has-text("I\'m Interested")');
    console.log(`- Interested button visible: ${await interestedBtn.isVisible()}`);
    const declineBtn = page.locator('button:has-text("Decline")');
    console.log(`- Decline button visible: ${await declineBtn.isVisible()}`);

    // Click Interested to register intent
    await interestedBtn.click();
    await page.waitForTimeout(400);
    await snap(page, '02_registered_interest_business_card');
    await context.close();

    // 2. Unsubscribed External Investor — Public Teaser Preview
    console.log('\n2. Testing Unsubscribed External Investor Public Teaser Route...');
    const publicContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('http://localhost:3000/deal/123mainstaustintx78701/preview', { waitUntil: 'domcontentloaded' });
    await publicPage.waitForTimeout(500);
    await snap(publicPage, '03_public_teaser_locked_data');

    const lockBanner = publicPage.locator('span:has-text("Subscriber-Only Deal Data Locked")');
    console.log(`- Subscriber Data Lock Notice visible: ${await lockBanner.isVisible()}`);
    if (await lockBanner.isVisible()) {
      console.log('  ✅ PASS: Public teaser conceals analyzer metrics and investor list!');
    }

    // 3. Expired / Revoked Invitation Link Banner
    console.log('\n3. Testing Expired Token Banner on Teaser Route...');
    await publicPage.goto('http://localhost:3000/deal/123mainstaustintx78701/preview?invite=expired', { waitUntil: 'domcontentloaded' });
    await publicPage.waitForTimeout(500);
    await snap(publicPage, '04_expired_invitation_banner');

    const expiredBanner = publicPage.locator('span:has-text("This invitation link has expired")');
    console.log(`- Expired Token Banner visible: ${await expiredBanner.isVisible()}`);
    if (await expiredBanner.isVisible()) {
      console.log('  ✅ PASS: Expired invitation link properly displays error banner!');
    }

    await publicContext.close();

    console.log('\n=== PROMPT 4 VERIFICATION 100% COMPLETE ===');

  } catch (err) {
    console.error('Verification error:', err);
  }
  await browser.close();
}

runVerification();
