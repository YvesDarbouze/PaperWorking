/**
 * PaperWorking — Ad-Grade Screenshot Capture Script
 *
 * Captures high-fidelity, Retina-quality screenshots across all 9 synthetic
 * investor personas for use in paid advertising creatives.
 *
 * Usage: node screenshot-ad-creatives.mjs [--persona=wholesaler] [--dark]
 *
 * Requirements:
 * - Dev server running on localhost:3000 (`npm run dev`)
 * - Crew accounts provisioned (crew+{key}@paperworking.co)
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ── Configuration ──────────────────────────────────────────────────────────────
const BASE = process.env.TARGET_URL || 'http://localhost:3000';
const OUT_ROOT = './screenshots/ad-creatives';
const CREW_PASSWORD = 'PaperWorkingCrew2026!';
const ADMIN_EMAIL = 'y@massters.io';
const ADMIN_PASSWORD = 'N0str@nd';

// Parse CLI args
const args = process.argv.slice(2);
const personaFilter = args.find(a => a.startsWith('--persona='))?.split('=')[1];
const forceDark = args.includes('--dark');
const mobileOnly = args.includes('--mobile-only');
const desktopOnly = args.includes('--desktop-only');

// ── Persona → Screen Mapping ───────────────────────────────────────────────────
// Each persona gets the screens that best showcase their investment strategy
const PERSONA_SCREEN_MAP = {
  // ── Priya Raman: Multifamily Landlord (24-unit complex — richest data) ──
  multifamily_landlord: {
    name: 'Priya Raman',
    email: 'crew+multifamily_landlord@paperworking.co',
    screens: [
      { name: '01-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center — hero shot' },
      { name: '02-insights', route: '/dashboard/insights', desc: 'Portfolio Insights & Analytics' },
      { name: '03-reports', route: '/dashboard/reports', desc: 'Financial Reports' },
      { name: '04-intelligence-hub', route: '/dashboard/intelligence', desc: 'Intelligence Hub — 13 calculators' },
      { name: '05-intelligence-noi', route: '/dashboard/intelligence/noi', desc: 'NOI Calculator' },
      { name: '06-intelligence-cap-rate', route: '/dashboard/intelligence/cap-rate', desc: 'Cap Rate Analysis' },
      { name: '07-intelligence-dscr', route: '/dashboard/intelligence/dscr', desc: 'DSCR Calculator' },
      { name: '08-intelligence-occupancy', route: '/dashboard/intelligence/occupancy', desc: 'Occupancy Rate Model' },
    ],
  },

  // ── Andre Kowalski: BRRRR Investor (4 stages — pipeline board magic) ──
  brrrr_investor: {
    name: 'Andre Kowalski',
    email: 'crew+brrrr_investor@paperworking.co',
    screens: [
      { name: '01-projects-pipeline', route: '/dashboard/projects', desc: 'Projects Pipeline Board — BRRRR stages' },
      { name: '02-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
      { name: '03-intelligence-ltv', route: '/dashboard/intelligence/ltv', desc: 'LTV Ratio Tracker' },
      { name: '04-intelligence-coc', route: '/dashboard/intelligence/coc', desc: 'Cash-on-Cash Return' },
    ],
  },

  // ── Marisol Vega: Fix & Flipper (mid-rehab + underwriting) ──
  fix_flipper: {
    name: 'Marisol Vega',
    email: 'crew+fix_flipper@paperworking.co',
    screens: [
      { name: '01-projects', route: '/dashboard/projects', desc: 'Projects — flip pipeline' },
      { name: '02-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
      { name: '03-deal-analyzer', route: '/dashboard/deal-analyzer', desc: 'Deal Analyzer Scorecard' },
      { name: '04-intelligence-irr', route: '/dashboard/intelligence/irr', desc: 'IRR Calculator' },
    ],
  },

  // ── Tom & Elaine Whitaker: Buy & Hold (cash flow focus) ──
  buy_hold: {
    name: 'Tom & Elaine Whitaker',
    email: 'crew+buy_hold@paperworking.co',
    screens: [
      { name: '01-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
      { name: '02-insights', route: '/dashboard/insights', desc: 'Portfolio Insights & Analytics' },
      { name: '03-intelligence-cash-flow', route: '/dashboard/intelligence/cash-flow', desc: 'Cash Flow Projections' },
      { name: '04-intelligence-performance', route: '/dashboard/intelligence/performance', desc: 'Portfolio Performance' },
      { name: '05-reports', route: '/dashboard/reports', desc: 'Financial Reports' },
    ],
  },

  // ── Marcus Delacroix: Syndicator (marketplace + team) ──
  syndicator: {
    name: 'Marcus Delacroix',
    email: 'crew+syndicator@paperworking.co',
    screens: [
      { name: '01-deals-marketplace', route: '/dashboard/deals', desc: 'Deals Marketplace' },
      { name: '02-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
      { name: '03-team', route: '/dashboard/team', desc: 'Team Management' },
      { name: '04-projects', route: '/dashboard/projects', desc: 'Projects Pipeline' },
    ],
  },

  // ── Deshawn Carter: Wholesaler (Active production account with live data) ──
  wholesaler: {
    name: 'Deshawn Carter',
    email: 'crew+wholesaler@paperworking.co',
    screens: [
      { name: '01-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center — hero shot' },
      { name: '02-projects-pipeline', route: '/dashboard/projects', desc: 'Projects Pipeline Board' },
      { name: '03-deal-analyzer', route: '/dashboard/deal-analyzer', desc: 'Deal Analyzer Scorecard' },
      { name: '04-deals-marketplace', route: '/dashboard/deals', desc: 'Deals Marketplace' },
      { name: '05-insights-analytics', route: '/dashboard/insights', desc: 'Portfolio Insights & Analytics' },
      { name: '06-intelligence-hub', route: '/dashboard/intelligence', desc: 'Intelligence Hub — 13 calculators' },
      { name: '07-financial-reports', route: '/dashboard/reports', desc: 'Financial Reports' },
      { name: '08-deal-sourcing', route: '/dashboard/sourcing', desc: 'Deal Sourcing Engine' },
      { name: '09-tax-depreciation', route: '/dashboard/tax', desc: 'Tax & Depreciation Center' },
      { name: '10-financials-terminal', route: '/dashboard/financials', desc: 'Financial Terminal' },
      { name: '11-team-management', route: '/dashboard/team', desc: 'Team Management' },
      { name: '12-billing-settings', route: '/dashboard/settings/billing', desc: 'Billing & Subscription Settings' },
    ],
  },

  // ── Helena Marsh: Commercial Investor (NNN leases) ──
  commercial_investor: {
    name: 'Helena Marsh',
    email: 'crew+commercial_investor@paperworking.co',
    screens: [
      { name: '01-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
      { name: '02-insights', route: '/dashboard/insights', desc: 'Portfolio Insights' },
      { name: '03-intelligence-oer', route: '/dashboard/intelligence/oer', desc: 'Operating Expense Ratio' },
    ],
  },

  // ── Gideon Brooks: Land Developer (long phase chain) ──
  land_developer: {
    name: 'Gideon Brooks',
    email: 'crew+land_developer@paperworking.co',
    screens: [
      { name: '01-projects', route: '/dashboard/projects', desc: 'Development pipeline' },
      { name: '02-command-center', route: '/dashboard/command-center', desc: 'Portfolio Command Center' },
    ],
  },

  // ── Grace Nakamura: REIT Investor (passive, light usage) ──
  reit_investor: {
    name: 'Grace Nakamura',
    email: 'crew+reit_investor@paperworking.co',
    screens: [
      { name: '01-command-center', route: '/dashboard/command-center', desc: 'Portfolio dashboard — passive view' },
    ],
  },
};

// ── Public pages (no login required) ──
const PUBLIC_SCREENS = [
  { name: 'landing-hero', route: '/', desc: 'Marketing Landing Page' },
  { name: 'pricing', route: '/pricing', desc: 'Pricing Page' },
  { name: 'how-it-works', route: '/how-it-works', desc: 'How It Works' },
  { name: 'login', route: '/login', desc: 'Login Page' },
  { name: 'register', route: '/register', desc: 'Registration Page' },
];

// ── Helper: Wait for full page hydration ──
async function waitForHydration(page, extra = 3000) {
  await page.waitForLoadState('domcontentloaded');
  // Wait for React/Next hydration markers
  try {
    await page.waitForFunction(
      () => !document.getElementById('__next')?.classList.contains('loading'),
      { timeout: 8000 }
    ).catch(() => {});
  } catch { /* safe to proceed */ }
  // Let CSS animations and chart renders settle
  await page.waitForTimeout(extra);
}

// ── Helper: Dismiss cookie/GDPR modals ──
async function dismissModals(page) {
  const acceptAll = page.locator('button:has-text("Accept All"), button:has-text("Accept all"), button:has-text("Got it")').first();
  if (await acceptAll.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptAll.click();
    await page.waitForTimeout(600);
    console.log('    ↳ dismissed cookie/GDPR modal');
  }
}

// ── Helper: Login flow ──
async function loginAs(page, context, email, password) {
  console.log(`  → Logging in as: ${email}`);

  // Force session logout & clear storage/cookies
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    try { await fetch('/api/auth/session', { method: 'DELETE' }); } catch {}
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    try { indexedDB.deleteDatabase('firebaseLocalStorageDb'); } catch {}
  }).catch(() => {});
  await context.clearCookies().catch(() => {});

  // Go to login page
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1500);

  // If still redirected to dashboard due to persistent session cookie, force clear again
  if (page.url().includes('/dashboard')) {
    console.log('    ↳ still redirected to dashboard, forcing DELETE /api/auth/session...');
    await page.evaluate(() => fetch('/api/auth/session', { method: 'DELETE' })).catch(() => {});
    await context.clearCookies().catch(() => {});
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);
  }

  await dismissModals(page);

  // Ensure Password tab is active (may have OAuth/Magic Link tabs)
  const pwTab = page.locator('button:has-text("Password")').first();
  if (await pwTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pwTab.click();
    await page.waitForTimeout(600);
  }

  // Fill credentials
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.waitForTimeout(300);

  // Submit
  await page.locator('button[type="submit"]:has-text("SIGN IN")').click();
  console.log('    ↳ submitted login');

  // Wait for redirect away from login
  try {
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 25000 });
    console.log(`    ↳ logged in → ${page.url()}`);
  } catch {
    const errText = await page.locator('[class*="error"], [role="alert"]').first()
      .innerText().catch(() => '(no error text)');
    console.error(`    ✘ login failed: ${errText}`);
    throw new Error(`Login failed for ${email}: ${errText}`);
  }

  // Let Firebase session + React fully hydrate
  await page.waitForTimeout(3000);
  await dismissModals(page);
}

// ── Helper: Take screenshot with retries ──
async function captureScreen(page, route, outputPath, { fullPage = false, clip = null } = {}) {
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForHydration(page, 4000);

      // Force dark mode theme on html element to match visual benchmark
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      }).catch(() => {});
      await page.waitForTimeout(400);

      await dismissModals(page);

      // Scroll to top for consistent framing
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const opts = { path: outputPath };
      if (fullPage) opts.fullPage = true;
      if (clip) opts.clip = clip;

      await page.screenshot(opts);
      console.log(`    ✓ saved: ${outputPath}`);
      return;
    } catch (err) {
      if (attempts >= 2) {
        console.error(`    ✘ capture failed for ${route}: ${err.message}`);
        return;
      }
      console.warn(`    ⚠ retry ${attempts} for ${route}...`);
      await page.waitForTimeout(2000);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PaperWorking — Ad-Grade Screenshot Capture             ║');
  console.log('║     Retina 2x · 1440×900 desktop · 375×812 mobile          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE}`);
  console.log(`  Output: ${OUT_ROOT}/`);
  console.log(`  Persona filter: ${personaFilter || 'ALL'}`);
  console.log(`  Dark mode: ${forceDark ? 'yes' : 'default theme'}`);
  console.log('');

  // ── Launch browser ──
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: Public Marketing Pages (no login)
    // ═══════════════════════════════════════════════════════════════
    if (!personaFilter) {
      console.log('━━━ PHASE 1: Public Marketing Pages ━━━');
      const pubDir = path.join(OUT_ROOT, '_public');
      await mkdir(pubDir, { recursive: true });

      const pubCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        colorScheme: forceDark ? 'dark' : 'light',
      });
      const pubPage = await pubCtx.newPage();
      await pubPage.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      for (const screen of PUBLIC_SCREENS) {
        console.log(`  → ${screen.desc}`);
        const outPath = path.join(pubDir, `${screen.name}.png`);
        await captureScreen(pubPage, screen.route, outPath);

        // Also capture full-page for landing
        if (screen.route === '/') {
          await captureScreen(pubPage, screen.route,
            path.join(pubDir, `${screen.name}-fullpage.png`), { fullPage: true });
        }
      }

      // Mobile variant of landing
      if (!desktopOnly) {
        console.log('  → Mobile: Landing Page');
        const mobileCtx = await browser.newContext({
          viewport: { width: 375, height: 812 },
          deviceScaleFactor: 2,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          isMobile: true,
          hasTouch: true,
          colorScheme: forceDark ? 'dark' : 'light',
        });
        const mobilePubPage = await mobileCtx.newPage();
        await mobilePubPage.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        await captureScreen(mobilePubPage, '/', path.join(pubDir, 'landing-hero-mobile.png'));
        await captureScreen(mobilePubPage, '/pricing', path.join(pubDir, 'pricing-mobile.png'));
        await mobileCtx.close();
      }

      await pubCtx.close();
      console.log('');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Authenticated Persona Screens
    // ═══════════════════════════════════════════════════════════════
    const personaKeys = personaFilter
      ? [personaFilter]
      : Object.keys(PERSONA_SCREEN_MAP);

    for (const pKey of personaKeys) {
      const persona = PERSONA_SCREEN_MAP[pKey];
      if (!persona) {
        console.warn(`  ⚠ Unknown persona: ${pKey}, skipping`);
        continue;
      }

      console.log(`━━━ PERSONA: ${persona.name} (${pKey}) ━━━`);
      const personaDir = path.join(OUT_ROOT, pKey);
      await mkdir(personaDir, { recursive: true });

      // ── Desktop context ──
      if (!mobileOnly) {
        const desktopCtx = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 2,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          colorScheme: forceDark ? 'dark' : 'light',
        });
        const desktopPage = await desktopCtx.newPage();
        await desktopPage.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Login
        try {
          await loginAs(desktopPage, desktopCtx, persona.email, CREW_PASSWORD);
        } catch (err) {
          console.error(`  ✘ Skipping ${pKey} — login failed: ${err.message}`);
          await desktopCtx.close();
          continue;
        }

        // Capture each screen
        for (const screen of persona.screens) {
          console.log(`  → [desktop] ${screen.desc}`);
          const outPath = path.join(personaDir, `desktop-${screen.name}.png`);
          await captureScreen(desktopPage, screen.route, outPath);
        }

        // Capture full-page version of command center (great for ads)
        console.log(`  → [desktop] Command Center (full page)`);
        await captureScreen(desktopPage, '/dashboard/command-center',
          path.join(personaDir, 'desktop-command-center-fullpage.png'), { fullPage: true });

        // ── KPI strip isolation (top zone crop) ──
        console.log(`  → [desktop] KPI strip crop`);
        await desktopPage.goto(`${BASE}/dashboard/command-center`, {
          waitUntil: 'domcontentloaded', timeout: 25000
        });
        await waitForHydration(desktopPage, 4000);
        await desktopPage.evaluate(() => window.scrollTo(0, 0));
        await desktopPage.waitForTimeout(500);
        await desktopPage.screenshot({
          path: path.join(personaDir, 'desktop-kpi-strip.png'),
          clip: { x: 0, y: 0, width: 1440, height: 420 },
        });
        console.log(`    ✓ saved: KPI strip`);

        // ── Dark mode variant of command center (if not already dark) ──
        if (!forceDark) {
          console.log(`  → [desktop] Command Center — dark mode variant`);
          // Try toggling theme via JS
          await desktopPage.goto(`${BASE}/dashboard/command-center`, {
            waitUntil: 'domcontentloaded', timeout: 25000
          });
          await waitForHydration(desktopPage, 4000);
          // Toggle dark mode via the HTML attribute the app uses
          await desktopPage.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
          });
          await desktopPage.waitForTimeout(1500);
          await desktopPage.screenshot({
            path: path.join(personaDir, 'desktop-command-center-dark.png'),
          });
          console.log(`    ✓ saved: dark mode variant`);
          // Reset to light
          await desktopPage.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
          });
        }

        await desktopCtx.close();
      }

      // ── Mobile context (select personas only — hero personas) ──
      const mobilePersonas = ['multifamily_landlord', 'fix_flipper', 'brrrr_investor', 'syndicator'];
      if (!desktopOnly && mobilePersonas.includes(pKey)) {
        console.log(`  → [mobile] Capturing mobile variants for ${persona.name}`);
        const mobileCtx = await browser.newContext({
          viewport: { width: 375, height: 812 },
          deviceScaleFactor: 2,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          isMobile: true,
          hasTouch: true,
          colorScheme: forceDark ? 'dark' : 'light',
        });
        const mobilePage = await mobileCtx.newPage();
        await mobilePage.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        try {
          await loginAs(mobilePage, mobileCtx, persona.email, CREW_PASSWORD);

          // Mobile command center
          console.log(`    → [mobile] Command Center`);
          await captureScreen(mobilePage, '/dashboard/command-center',
            path.join(personaDir, 'mobile-command-center.png'));

          // Mobile projects
          console.log(`    → [mobile] Projects`);
          await captureScreen(mobilePage, '/dashboard/projects',
            path.join(personaDir, 'mobile-projects.png'));

          // Mobile insights (if applicable)
          if (pKey === 'multifamily_landlord' || pKey === 'syndicator') {
            console.log(`    → [mobile] Insights`);
            await captureScreen(mobilePage, '/dashboard/insights',
              path.join(personaDir, 'mobile-insights.png'));
          }
        } catch (err) {
          console.error(`  ✘ Mobile capture failed for ${pKey}: ${err.message}`);
        }

        await mobileCtx.close();
      }

      console.log('');
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Admin account — capture settings / billing / marketplace
    // ═══════════════════════════════════════════════════════════════
    if (!personaFilter) {
      console.log('━━━ PHASE 3: Admin Account — Settings & Marketplace ━━━');
      const adminDir = path.join(OUT_ROOT, '_admin');
      await mkdir(adminDir, { recursive: true });

      const adminCtx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      });
      const adminPage = await adminCtx.newPage();
      await adminPage.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      try {
        await loginAs(adminPage, adminCtx, ADMIN_EMAIL, ADMIN_PASSWORD);

        const adminScreens = [
          { name: 'marketplace', route: '/dashboard/marketplace', desc: 'Vendor Marketplace' },
          { name: 'billing', route: '/dashboard/settings/billing', desc: 'Billing & Subscription' },
          { name: 'settings', route: '/dashboard/settings', desc: 'Settings Directory' },
          { name: 'profile', route: '/dashboard/settings/profile', desc: 'User Profile' },
          { name: 'inbox', route: '/dashboard/inbox', desc: 'Unified Inbox' },
          { name: 'calendar', route: '/dashboard/calendar', desc: 'Investor Calendar' },
          { name: 'tax', route: '/dashboard/tax', desc: 'Tax & Depreciation Center' },
          { name: 'financials', route: '/dashboard/financials', desc: 'Financial Terminal' },
          { name: 'data-room', route: '/dashboard/data-room', desc: 'Document Data Room' },
        ];

        for (const screen of adminScreens) {
          console.log(`  → ${screen.desc}`);
          await captureScreen(adminPage, screen.route,
            path.join(adminDir, `${screen.name}.png`));
        }
      } catch (err) {
        console.error(`  ✘ Admin capture failed: ${err.message}`);
      }

      await adminCtx.close();
    }

  } finally {
    await browser.close();
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Generate manifest
  // ═══════════════════════════════════════════════════════════════
  console.log('━━━ GENERATING MANIFEST ━━━');
  const { readdirSync, statSync } = await import('fs');

  function walkDir(dir, prefix = '') {
    const entries = [];
    if (!existsSync(dir)) return entries;
    for (const f of readdirSync(dir)) {
      const full = path.join(dir, f);
      const st = statSync(full);
      if (st.isDirectory()) {
        entries.push(...walkDir(full, path.join(prefix, f)));
      } else if (f.endsWith('.png')) {
        entries.push({
          path: path.join(prefix, f),
          sizeKB: Math.round(st.size / 1024),
          resolution: '2880×1800 (2x Retina)',
        });
      }
    }
    return entries;
  }

  const manifest = walkDir(OUT_ROOT);
  const manifestPath = path.join(OUT_ROOT, 'MANIFEST.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ Manifest: ${manifestPath} (${manifest.length} screenshots)`);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ COMPLETE — ${manifest.length} screenshots captured                    ║`);
  console.log(`║  📁 Output: ${OUT_ROOT}/                              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
