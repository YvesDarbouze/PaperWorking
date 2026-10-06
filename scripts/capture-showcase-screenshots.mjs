import { chromium } from '@playwright/test';
import { createHmac } from 'crypto';
import path from 'path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/c0ce04aa-d4cd-4329-8427-797d8226b49e';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

function generateValidSessionToken(uid = 'usr-lead-investor') {
  const payload = {
    uid,
    email: 'lead@paperworking.com',
    accountType: 'investor',
    expiresAt: Date.now() + 86400000 * 30,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.SESSION_SECRET || 'paperworking_session_secure_key_2026_prod';
  const sig = createHmac('sha256', secret).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${sig}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const token = generateValidSessionToken();

  const cookies = [
    { name: '__session', value: token, domain: 'localhost', path: '/' },
    { name: '__sub', value: Buffer.from(JSON.stringify({ plan: 'Team', status: 'active' })).toString('base64'), domain: 'localhost', path: '/' },
    { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
    { name: 'pw_org_id', value: 'org-1', domain: 'localhost', path: '/' },
  ];

  // 1. Desktop Context (1440 x 900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await desktopContext.addCookies(cookies);
  const page = await desktopContext.newPage();

  console.log('1. Capturing Marketing Home...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_marketing_home.png'), fullPage: false });

  console.log('2. Capturing Deal Calculator v2...');
  await page.goto('http://localhost:3000/deal-calculator', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_deal_calculator.png'), fullPage: false });

  console.log('3. Capturing Deals Marketplace...');
  await page.goto('http://localhost:3000/marketplace', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_deals_marketplace.png'), fullPage: false });

  console.log('4. Capturing Project Workspace (Acquisition Phase)...');
  await page.goto('http://localhost:3000/project/deal-3?phase=acquisition', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_project_acquisition.png'), fullPage: false });

  console.log('5. Capturing Project Workspace (Fund Phase)...');
  await page.goto('http://localhost:3000/project/deal-3?phase=purchase', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_project_fund.png'), fullPage: false });

  console.log('6. Capturing Project Workspace (Hold Phase)...');
  await page.goto('http://localhost:3000/project/deal-3?phase=hold', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_project_hold.png'), fullPage: false });

  console.log('7. Capturing Project Workspace (Exit Phase)...');
  await page.goto('http://localhost:3000/project/deal-3?phase=exit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_project_exit.png'), fullPage: false });

  await desktopContext.close();

  // 2. Mobile Context (iPhone 14)
  console.log('8. Capturing Mobile Responsive View (Hold Phase)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await mobileContext.addCookies(cookies);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/project/deal-3?phase=hold', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '08_mobile_reil_responsive.png'), fullPage: false });

  await mobileContext.close();
  await browser.close();
  console.log('Successfully captured all 8 authentic showcase views!');
}

main().catch((err) => {
  console.error('Failed to capture showcase screenshots:', err);
  process.exit(1);
});
