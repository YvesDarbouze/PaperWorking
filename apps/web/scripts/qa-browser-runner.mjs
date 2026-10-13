import { chromium } from 'playwright';
import path from 'path';
import { createSessionToken } from '@paperworking/api';

const ARTIFACT_DIR = '/Users/yvesdarbouze/.gemini/antigravity/brain/8893c58f-8c2a-486e-8b44-240d05ab5ce9/qa';

async function runQA() {
  console.log('🚀 Starting Browser-QA Testing with verified session auth...');
  process.env.SESSION_SECRET = 'cf516b19f2120ae311cfd1f0d4a34ba647743cdaf0a636b349098f5410a39290';

  const browser = await chromium.launch({ headless: true });

  const validSessionToken = createSessionToken({
    uid: 'usr-lead-1',
    email: 'lead@paperworking.co',
    accountType: 'admin',
    expiresAt: Date.now() + 3600000,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: '__session',
      value: validSessionToken,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'pw_org_id',
      value: 'org-1',
      domain: 'localhost',
      path: '/',
    },
  ]);

  const page = await context.newPage();

  // Test 1: Project Overview
  console.log('1. Loading Project Workspace Overview...');
  await page.goto('http://localhost:3000/project/deal-lifecycle', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-01-overview-desktop.png') });
  console.log('   Saved: browser-01-overview-desktop.png');

  // Test 2: Vendor Access Banner & Preview Mode
  console.log('2. Testing Vendor Mode Toggle...');
  const vendorBtn = page.getByRole('button', { name: /Preview Vendor View/i });
  if (await vendorBtn.isVisible()) {
    await vendorBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-02-vendor-mode-active.png') });
    console.log('   Saved: browser-02-vendor-mode-active.png');

    // Toggle back
    const exitBtn = page.getByRole('button', { name: /Exit Vendor Mode/i });
    if (await exitBtn.isVisible()) {
      await exitBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Test 3: Invite Team Modal & Multi-Row / Roles
  console.log('3. Testing Invite Team Modal...');
  const inviteBtn = page.getByRole('button', { name: /Invite Team/i });
  if (await inviteBtn.isVisible()) {
    await inviteBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-03-invite-team-modal.png') });
    console.log('   Saved: browser-03-invite-team-modal.png');

    // Add another person row
    const addPersonBtn = page.getByRole('button', { name: /Add another person/i });
    if (await addPersonBtn.isVisible()) {
      await addPersonBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to Vendor/Guest tab inside modal
    const guestTab = page.getByRole('button', { name: /Vendor \/ Contractor \/ Guest/i });
    if (await guestTab.isVisible()) {
      await guestTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-04-invite-vendor-modal.png') });
      console.log('   Saved: browser-04-invite-vendor-modal.png');
    }

    // Switch to Public Share Links tab
    const publicLinksTab = page.getByRole('button', { name: /Shareable Public Links/i });
    if (await publicLinksTab.isVisible()) {
      await publicLinksTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-05-public-links-tab.png') });
      console.log('   Saved: browser-05-public-links-tab.png');
    }

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close modal"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Test 4: Public Link Generation and Verification
  console.log('4. Generating real public link via API...');
  const apiRes = await context.request.post('http://localhost:3000/api/projects/deal-lifecycle/public-links', {
    data: {
      page: 'overview',
      label: 'QA City Inspector Link',
      vendorOnly: true,
      expiresInDays: 30,
    },
    headers: {
      cookie: `__session=${validSessionToken}; pw_org_id=org-1`,
    },
  });
  const linkJson = await apiRes.json();
  const token = linkJson.link?.token;
  console.log('   Generated token:', token);

  if (token) {
    console.log('5. Testing Public Viewer Page (Unauthenticated Incognito)...');
    const incognito = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const publicPage = await incognito.newPage();
    await publicPage.goto(`http://localhost:3000/public/project/deal-lifecycle/overview?token=${encodeURIComponent(token)}`, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await publicPage.waitForTimeout(3000);
    await publicPage.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-06-public-viewer-desktop.png') });
    console.log('   Saved: browser-06-public-viewer-desktop.png');

    // Test mobile viewport for public link
    await publicPage.setViewportSize({ width: 390, height: 844 });
    await publicPage.waitForTimeout(1000);
    await publicPage.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-07-public-viewer-mobile.png') });
    console.log('   Saved: browser-07-public-viewer-mobile.png');
    await incognito.close();
  }

  // Test 5: Mobile Project View
  console.log('6. Testing Mobile Project Workspace View (390px)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'browser-08-project-mobile.png') });
  console.log('   Saved: browser-08-project-mobile.png');

  await browser.close();
  console.log('✅ Browser-QA Testing Completed successfully!');
}

runQA().catch((err) => {
  console.error('Browser QA failed:', err);
  process.exit(1);
});
