import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/b823e882-4415-4439-893a-38927c3aab61';
const BASE_URL = 'http://localhost:3000';

async function captureAdminTicketsScreenshots() {
  console.log('[Screenshots] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Context (1280x850)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });

  // Set admin session cookies
  await context.addCookies([
    { name: '__session', value: 'dev-admin-session', url: 'http://localhost:3000' },
    { name: '__acct', value: 'admin', url: 'http://localhost:3000' },
  ]);

  const page = await context.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('response', (res) => {
    if (res.status() >= 400) console.log('FAILED RESPONSE:', res.status(), res.url());
  });

  page.on('request', (req) => {
    if (req.url().includes('tickets')) console.log('REQ TICKETS:', req.method(), req.url());
  });

  console.log('[Screenshots] Navigating to /admin/tickets...');
  await page.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
  console.log('[Screenshots] Current URL:', page.url());

  // Wait for table to load and React hydration to settle
  await page.waitForSelector('[data-testid="admin-tickets-table"]', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: Desktop Overview
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '06-admin-tickets-overview-desktop.png'),
    fullPage: false,
  });
  console.log('Saved 06-admin-tickets-overview-desktop.png');

  // Open Engagement Inspector for Callback Request (Row 1: PW-CALL-28491, completely unobstructed)
  console.log('[Screenshots] Clicking first inspect button (PW-CALL-28491)...');
  const firstInspectBtn = page.locator('button:has-text("Inspect")').first();
  await firstInspectBtn.click();
  await page.waitForSelector('[data-testid="admin-ticket-inspector"]', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Screenshot 2: Engagement Inspector Drawer
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '07-admin-tickets-inspector-drawer.png'),
    fullPage: false,
  });
  console.log('Saved 07-admin-tickets-inspector-drawer.png');

  await page.close();
  await context.close();

  // 2. Mobile Context (390x844 - iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobileContext.addCookies([
    { name: '__session', value: 'dev-admin-session', url: 'http://localhost:3000' },
    { name: '__acct', value: 'admin', url: 'http://localhost:3000' },
  ]);

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('[data-testid="admin-tickets-table"]', { timeout: 10000 });
  await mobilePage.waitForTimeout(1000);

  // Screenshot 3: Mobile Overview
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, '08-admin-tickets-mobile-view.png'),
    fullPage: false,
  });
  console.log('Saved 08-admin-tickets-mobile-view.png');

  // Open Inspector on Mobile
  console.log('[Screenshots] Clicking first mobile ticket row...');
  await mobilePage.locator('tr:has-text("PW-CALL-28491")').click();
  await mobilePage.waitForSelector('[data-testid="admin-ticket-inspector"]', { timeout: 8000 });
  await mobilePage.waitForTimeout(1000);

  // Screenshot 4: Mobile Inspector Drawer
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, '09-admin-tickets-mobile-inspector.png'),
    fullPage: false,
  });
  console.log('Saved 09-admin-tickets-mobile-inspector.png');

  await mobilePage.close();
  await mobileContext.close();

  await browser.close();
  console.log('[Screenshots] All admin tickets screenshots captured successfully!');
}

captureAdminTicketsScreenshots().catch((err) => {
  console.error('[Screenshots Error]:', err);
  process.exit(1);
});
