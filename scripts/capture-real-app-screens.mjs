import { chromium } from '@playwright/test';
import { createHmac } from 'crypto';
import path from 'path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/ad6468c7-7cd1-4b82-b77a-da6d5866895f';
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

  // -------------------------------------------------------------
  // Part 1: MOBILE FIRST SCREENS (390 x 844 iPhone 14)
  // -------------------------------------------------------------
  console.log('--- CAPTURING MOBILE FIRST SCREENS ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await mobileContext.addCookies(cookies);
  const mobilePage = await mobileContext.newPage();

  console.log('Mobile 1: Dashboard Home (/dashboard)');
  await mobilePage.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_01_dashboard.png'), fullPage: false });

  console.log('Mobile 2: Deal Calculator (/deal-calculator)');
  await mobilePage.goto('http://localhost:3000/deal-calculator', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_02_deal_calculator.png'), fullPage: false });

  console.log('Mobile 3: Deals Marketplace (/dashboard/deals)');
  await mobilePage.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_03_deals_marketplace.png'), fullPage: false });

  console.log('Mobile 4: Portfolio Insights (/dashboard/insights)');
  await mobilePage.goto('http://localhost:3000/dashboard/insights', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_04_insights.png'), fullPage: false });

  console.log('Mobile 5: Project Workspace Hold Phase (/project/deal-3?phase=hold)');
  await mobilePage.goto('http://localhost:3000/project/deal-3?phase=hold', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_05_project_hold.png'), fullPage: false });

  console.log('Mobile 6: Project Workspace Fund Phase (/project/deal-2?phase=purchase)');
  await mobilePage.goto('http://localhost:3000/project/deal-2?phase=purchase', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_06_project_fund.png'), fullPage: false });

  console.log('Mobile 7: Tax Reports (/dashboard/reports)');
  await mobilePage.goto('http://localhost:3000/dashboard/reports', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_07_reports.png'), fullPage: false });

  console.log('Mobile 8: Team Directory (/dashboard/team)');
  await mobilePage.goto('http://localhost:3000/dashboard/team', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile_08_team.png'), fullPage: false });

  await mobileContext.close();

  // -------------------------------------------------------------
  // Part 2: DESKTOP SCREENS (1440 x 900)
  // -------------------------------------------------------------
  console.log('--- CAPTURING DESKTOP SCREENS ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await desktopContext.addCookies(cookies);
  const desktopPage = await desktopContext.newPage();

  console.log('Desktop 1: Dashboard Home (/dashboard)');
  await desktopPage.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_01_dashboard.png'), fullPage: false });

  console.log('Desktop 2: Deal Calculator (/deal-calculator)');
  await desktopPage.goto('http://localhost:3000/deal-calculator', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_02_deal_calculator.png'), fullPage: false });

  console.log('Desktop 3: Deals Marketplace (/dashboard/deals)');
  await desktopPage.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_03_deals_marketplace.png'), fullPage: false });

  console.log('Desktop 4: Portfolio Insights (/dashboard/insights)');
  await desktopPage.goto('http://localhost:3000/dashboard/insights', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_04_insights.png'), fullPage: false });

  console.log('Desktop 5: Project Workspace Hold Phase (/project/deal-3?phase=hold)');
  await desktopPage.goto('http://localhost:3000/project/deal-3?phase=hold', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_05_project_hold.png'), fullPage: false });

  console.log('Desktop 6: Project Workspace Fund Phase (/project/deal-2?phase=purchase)');
  await desktopPage.goto('http://localhost:3000/project/deal-2?phase=purchase', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_06_project_fund.png'), fullPage: false });

  console.log('Desktop 7: Project Workspace Acquisition Phase (/project/deal-lifecycle?phase=acquisition)');
  await desktopPage.goto('http://localhost:3000/project/deal-lifecycle?phase=acquisition', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_07_project_acquisition.png'), fullPage: false });

  console.log('Desktop 8: Tax Reports & CPA Center (/dashboard/reports)');
  await desktopPage.goto('http://localhost:3000/dashboard/reports', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_08_reports.png'), fullPage: false });

  console.log('Desktop 9: Team Directory (/dashboard/team)');
  await desktopPage.goto('http://localhost:3000/dashboard/team', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_09_team.png'), fullPage: false });

  console.log('Desktop 10: Settings (/dashboard/settings)');
  await desktopPage.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop_10_settings.png'), fullPage: false });

  await desktopContext.close();
  await browser.close();
  console.log('All real PaperWorking App mobile and desktop screens successfully captured!');
}

main().catch((err) => {
  console.error('Failed to capture real app screenshots:', err);
  process.exit(1);
});
