import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'screenshots', 'reachability_audit');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runReachabilityAudit() {
  console.log('=== STARTING SYSTEMATIC REACHABILITY & WAYFINDING AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });
  
  // Desktop context
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopContext.newPage();

  // Mobile context (375px width - iPhone SE / standard mobile)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();

  async function snap(p, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await p.screenshot({ path: filePath, fullPage: false });
    console.log(`[SAVED] -> public/screenshots/reachability_audit/${name}.png`);
  }

  const navMap = [];

  try {
    // ── TEST 1 & 3: Desktop Nav Map & Wayfinding ──
    console.log('--- TEST 1: Desktop Navigation Map & Wayfinding ---');
    await page.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await snap(page, 'desktop_01_portfolio');

    const surfaces = [
      { name: 'Portfolio', url: '/dashboard/command-center', expectedClicks: 1 },
      { name: 'Projects', url: '/dashboard/projects', expectedClicks: 1 },
      { name: 'Insights', url: '/dashboard/insights', expectedClicks: 1 },
      { name: 'Reports', url: '/dashboard/reports', expectedClicks: 1 },
      { name: 'Inbox (Messages)', url: '/dashboard/inbox', expectedClicks: 1 },
      { name: 'Team', url: '/dashboard/team', expectedClicks: 1 },
      { name: 'Profile', url: '/dashboard/settings/profile', expectedClicks: 1 },
      { name: 'Billing', url: '/dashboard/settings/billing', expectedClicks: 1 },
      { name: 'Settings', url: '/dashboard/settings', expectedClicks: 1 },
      { name: 'Deals Marketplace', url: '/dashboard/deals', expectedClicks: 'Orphan' },
      { name: 'Vendor Marketplace', url: '/dashboard/marketplace', expectedClicks: 'Orphan' },
      { name: 'Deal Analyzer', url: '/dashboard/deal-analyzer', expectedClicks: 'Orphan' },
      { name: 'Tax Hub', url: '/dashboard/tax', expectedClicks: 'Orphan' },
      { name: 'Intelligence Hub', url: '/dashboard/intelligence', expectedClicks: 'Orphan' },
      { name: 'Data Room', url: '/dashboard/data-room', expectedClicks: 'Orphan' },
    ];

    for (const s of surfaces) {
      await page.goto(`http://localhost:3000${s.url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const title = await page.title();
      const h1 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
      const filename = `desktop_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await snap(page, filename);

      // Check if item is in Sidebar
      const inSidebar = await page.locator(`aside a[href="${s.url}"]`).count();

      console.log(`Surface: ${s.name} | Route: ${s.url} | In Sidebar: ${inSidebar > 0 ? 'YES (1 click)' : 'NO (Orphan)'} | Tab Title: "${title}" | Header: "${h1.trim()}"`);
    }


    // ── TEST 2: 3-Level Deep Wayfinding Check ──
    console.log('\n--- TEST 3: 3-Level Deep Navigation Check ---');
    // Level 1: Projects (/dashboard/projects)
    // Level 2: Project Detail (/dashboard/projects/[id])
    // Level 3: Phase 1 Acquisition (/dashboard/projects/[id]/phase-1)
    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'domcontentloaded' });
    await snap(page, 'wayfinding_l1_projects');

    const projectLink = await page.locator('a[href*="/dashboard/projects/"]').first();
    if (await projectLink.count() > 0) {
      await projectLink.click();
      await page.waitForTimeout(500);
      await snap(page, 'wayfinding_l2_project_detail');

      const phaseLink = await page.locator('a[href*="/phase-1"]').first();
      if (await phaseLink.count() > 0) {
        await phaseLink.click();
        await page.waitForTimeout(500);
        await snap(page, 'wayfinding_l3_phase1');
      }
    }


    // ── TEST 4: Mobile Nav Map at 375px Viewport ──
    console.log('\n--- TEST 4: Mobile Navigation (375px Viewport) ---');
    await mobilePage.goto('http://localhost:3000/dashboard/command-center', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1000);
    await snap(mobilePage, 'mobile_01_portfolio_bottom_nav');

    // Inspect bottom nav items
    const bottomNavItems = await mobilePage.locator('nav.md\\:hidden a').allTextContents();
    console.log('Mobile Bottom Nav Items:', bottomNavItems.map(i => i.trim().replace(/\s+/g, ' ')));

    // Check header hamburger / user menu
    await snap(mobilePage, 'mobile_header_top_bar');


    // ── TEST 5: Deep-Link & Auth-Gate Behavior ──
    console.log('\n--- TEST 5: Deep-Link & Auth-Gate Behavior ---');
    // Clear storage/cookies for unauthenticated test
    const unauthContext = await browser.newContext();
    const unauthPage = await unauthContext.newPage();

    console.log('Visiting /dashboard/deals logged out...');
    await unauthPage.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'domcontentloaded' });
    await unauthPage.waitForTimeout(1000);
    console.log('Destination URL for logged-out /dashboard/deals:', unauthPage.url());
    await snap(unauthPage, 'unauth_deals_redirect');

    console.log('Visiting /dashboard/marketplace logged out...');
    await unauthPage.goto('http://localhost:3000/dashboard/marketplace', { waitUntil: 'domcontentloaded' });
    await unauthPage.waitForTimeout(1000);
    console.log('Destination URL for logged-out /dashboard/marketplace:', unauthPage.url());
    await snap(unauthPage, 'unauth_marketplace_redirect');


    // ── TEST 6: Tab Titles & 404 Pages ──
    console.log('\n--- TEST 6: Tab Titles & 404 Pages ---');
    await page.goto('http://localhost:3000/some-non-existent-route-12345', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const title404 = await page.title();
    console.log('404 Page Tab Title:', title404);
    await snap(page, '404_non_existent_route');

    await unauthContext.close();
    console.log('\n=== REACHABILITY & WAYFINDING AUDIT COMPLETE ===');

  } catch (err) {
    console.error('Reachability audit error:', err);
  } finally {
    await browser.close();
  }
}

runReachabilityAudit();
