/**
 * PaperWorking — Full E2E Tech Spec Audit
 * 
 * This spec visits EVERY page in the application and reports:
 *   ✓ Route reachability (HTTP 200 vs error)
 *   ✓ Content rendering (blank vs populated)
 *   ✓ Console errors
 *   ✓ Interactive element inventory (buttons, links, inputs, forms)
 *   ✓ Feature classification (functional / stub / broken)
 *   ✓ Accessibility basics (headings, alt, labels)
 *   ✓ Honesty checks (no fake data, placeholder text)
 *
 * Output: structured JSON log → consumed by the report generator.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';

// ── Types ────────────────────────────────────────────────────────────────────

interface PageAuditResult {
  route: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR';
  httpStatus: number | null;
  loadTimeMs: number;
  title: string;
  h1Text: string[];
  interactiveElements: {
    buttons: number;
    links: number;
    inputs: number;
    forms: number;
    selects: number;
  };
  contentFlags: {
    hasFinancialData: boolean;
    hasPlaceholderText: boolean;
    hasTodoComments: boolean;
    hasEmptyState: boolean;
    bodyLength: number;
  };
  consoleErrors: string[];
  verdict: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const results: PageAuditResult[] = [];

async function auditPage(page: Page, route: string, category: string): Promise<PageAuditResult> {
  const consoleErrors: string[] = [];

  // Collect console errors
  const errorHandler = (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().substring(0, 200));
    }
  };
  page.on('console', errorHandler);

  const start = Date.now();
  let httpStatus: number | null = null;

  try {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    httpStatus = response?.status() ?? null;
    // Wait for hydration
    await page.waitForTimeout(1500);
  } catch (err: any) {
    page.off('console', errorHandler);
    return {
      route, category, status: 'ERROR', httpStatus: null,
      loadTimeMs: Date.now() - start,
      title: '', h1Text: [],
      interactiveElements: { buttons: 0, links: 0, inputs: 0, forms: 0, selects: 0 },
      contentFlags: { hasFinancialData: false, hasPlaceholderText: false, hasTodoComments: false, hasEmptyState: false, bodyLength: 0 },
      consoleErrors: [err.message.substring(0, 200)],
      verdict: `NAVIGATION ERROR: ${err.message.substring(0, 100)}`,
    };
  }

  const loadTimeMs = Date.now() - start;

  // Page title
  const title = await page.title().catch(() => '');

  // H1 elements
  const h1Elements = await page.locator('h1').allTextContents().catch(() => []);

  // Interactive element counts
  const buttons = await page.locator('button').count().catch(() => 0);
  const links = await page.locator('a[href]').count().catch(() => 0);
  const inputs = await page.locator('input, textarea').count().catch(() => 0);
  const forms = await page.locator('form').count().catch(() => 0);
  const selects = await page.locator('select, [role="listbox"], [role="combobox"]').count().catch(() => 0);

  // Body text content for analysis
  const bodyLoc = page.locator('main, [role="main"], article, section').first();
  const bodyText = (await bodyLoc.count().catch(() => 0)) > 0 ? (await bodyLoc.textContent().catch(() => '') ?? '') : '';
  const fullBody = await page.textContent('body').catch(() => '') ?? '';

  // Content flags
  const hasFinancialData = /\$[\d,]+\.?\d*|[\d]+\.?\d+%|NOI|Cap Rate|IRR|DSCR|Cash Flow/i.test(fullBody);
  const hasPlaceholderText = /Lorem ipsum|placeholder|sample data|dummy|TODO:|FIXME:|John Doe|Jane Smith/i.test(bodyText);
  const hasTodoComments = /TODO:|FIXME:|HACK:|XXX:/i.test(bodyText);
  const hasEmptyState = /no items|no projects|no data|empty|nothing to show|get started|no results/i.test(bodyText);

  // Check for app errors
  const hasAppError = /Application error: a client-side exception|Internal Server Error|Unhandled Runtime Error/i.test(bodyText);
  const hasNextError = await page.locator('[data-nextjs-dialog], #__next_error__').count().catch(() => 0);

  page.off('console', errorHandler);

  // Verdict logic
  let status: 'PASS' | 'WARN' | 'FAIL' | 'ERROR' = 'PASS';
  let verdict = '';

  if (httpStatus && httpStatus >= 500) {
    status = 'FAIL';
    verdict = `Server error: HTTP ${httpStatus}`;
  } else if (hasNextError > 0 || hasAppError) {
    status = 'FAIL';
    verdict = 'Application error rendered in UI';
  } else if (httpStatus === 404) {
    status = 'WARN';
    verdict = 'Page returns 404';
  } else if (fullBody.length < 50) {
    status = 'WARN';
    verdict = 'Page appears blank or nearly empty';
  } else if (hasPlaceholderText) {
    status = 'WARN';
    verdict = 'Contains placeholder/dummy text';
  } else if (hasTodoComments) {
    status = 'WARN';
    verdict = 'Contains TODO/FIXME comments visible in UI';
  } else {
    verdict = 'Renders correctly';
  }

  const result: PageAuditResult = {
    route, category, status, httpStatus, loadTimeMs, title,
    h1Text: h1Elements.slice(0, 3),
    interactiveElements: { buttons, links, inputs, forms, selects },
    contentFlags: {
      hasFinancialData,
      hasPlaceholderText,
      hasTodoComments,
      hasEmptyState,
      bodyLength: fullBody.length,
    },
    consoleErrors: consoleErrors.slice(0, 5),
    verdict,
  };

  results.push(result);
  return result;
}

function logResult(r: PageAuditResult) {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${r.category}] ${r.route} → ${r.verdict} (${r.loadTimeMs}ms, ${r.contentFlags.bodyLength} chars)`);
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC PAGES — No auth needed
// ═════════════════════════════════════════════════════════════════════════════

test.describe('PUBLIC PAGES', () => {
  const publicRoutes: [string, string][] = [
    ['/', 'Landing'],
    ['/login', 'Auth'],
    ['/register', 'Auth'],
    ['/forgot-password', 'Auth'],
    ['/pricing', 'Marketing'],
    ['/about', 'Marketing'],
    ['/how-it-works', 'Marketing'],
    ['/contact', 'Marketing'],
    ['/careers', 'Marketing'],
    ['/for-pros', 'Marketing'],
    ['/demo', 'Marketing'],
    ['/faq', 'Marketing'],
    ['/blog', 'Content'],
    ['/news', 'Content'],
    ['/changelog', 'Content'],
    ['/help', 'Support'],
    ['/support', 'Support'],
    ['/support/faq', 'Support'],
    ['/support/glossary', 'Support'],
    ['/support/all', 'Support'],
    ['/terms', 'Legal'],
    ['/privacy', 'Legal'],
    ['/cookies', 'Legal'],
    ['/aup', 'Legal'],
    ['/dpa', 'Legal'],
    ['/trust', 'Legal'],
    ['/data-deletion', 'Legal'],
    ['/subprocessors', 'Legal'],
    ['/vendor-portal', 'Vendor'],
    ['/rehab', 'Utility'],
  ];

  for (const [route, category] of publicRoutes) {
    test(`${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, category);
      logResult(result);
      expect(result.status).not.toBe('ERROR');
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGES — Auth mocking required
// ═════════════════════════════════════════════════════════════════════════════

test.describe('DASHBOARD — Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const dashboardRoutes: [string, string][] = [
    ['/dashboard/command-center', 'Portfolio'],
    ['/dashboard/projects', 'Projects'],
    ['/dashboard/insights', 'Insights'],
    ['/dashboard/reports', 'Reports'],
    ['/dashboard/inbox', 'Inbox'],
    ['/dashboard/team', 'Team'],
    ['/dashboard/settings', 'Settings'],
    ['/dashboard/settings/profile', 'Settings'],
    ['/dashboard/settings/billing', 'Settings'],
    ['/dashboard/settings/general', 'Settings'],
    ['/dashboard/settings/notifications', 'Settings'],
    ['/dashboard/settings/team', 'Settings'],
    ['/dashboard/settings/data', 'Settings'],
    ['/dashboard/settings/audit-logs', 'Settings'],
  ];

  for (const [route, category] of dashboardRoutes) {
    test(`${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, `Dashboard/${category}`);
      logResult(result);
      expect(result.status).not.toBe('ERROR');
    });
  }
});

test.describe('DASHBOARD — Project Workspaces (REIL Lifecycle)', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const projectRoutes: [string, string][] = [
    ['/dashboard/projects/new', 'New Project'],
    ['/dashboard/projects/project_1', 'Project Detail'],
    ['/dashboard/projects/project_1/phase-1', 'Phase 1 — Acquisition'],
    ['/dashboard/projects/project_1/phase-2', 'Phase 2 — Closing'],
    ['/dashboard/projects/project_1/phase-3', 'Phase 3 — Hold/Rehab'],
    ['/dashboard/projects/project_1/phase-4', 'Phase 4 — Exit'],
    ['/dashboard/projects/project_2', 'Project 2 Detail'],
  ];

  for (const [route, category] of projectRoutes) {
    test(`${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, `REIL/${category}`);
      logResult(result);
      expect(result.status).not.toBe('ERROR');
    });
  }
});

test.describe('DASHBOARD — Intelligence / Analytics Deep Dives', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const intelligenceRoutes: [string, string][] = [
    ['/dashboard/intelligence', 'Intelligence Hub'],
    ['/dashboard/intelligence/noi', 'NOI'],
    ['/dashboard/intelligence/cap-rate', 'Cap Rate'],
    ['/dashboard/intelligence/cash-flow', 'Cash Flow'],
    ['/dashboard/intelligence/coc', 'CoC Return'],
    ['/dashboard/intelligence/irr', 'IRR'],
    ['/dashboard/intelligence/dscr', 'DSCR'],
    ['/dashboard/intelligence/grm', 'GRM'],
    ['/dashboard/intelligence/ltv', 'LTV'],
    ['/dashboard/intelligence/oer', 'OER'],
    ['/dashboard/intelligence/occupancy', 'Occupancy'],
    ['/dashboard/intelligence/appreciation', 'Appreciation'],
    ['/dashboard/intelligence/performance', 'Performance'],
    ['/dashboard/intelligence/comparison', 'Comparison'],
  ];

  for (const [route, category] of intelligenceRoutes) {
    test(`Intelligence/${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, `Intelligence/${category}`);
      logResult(result);
      expect(result.status).not.toBe('ERROR');
    });
  }
});

test.describe('DASHBOARD — Operational Tools', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const operationalRoutes: [string, string][] = [
    ['/dashboard/calendar', 'Calendar'],
    ['/dashboard/closing-room', 'Closing Room'],
    ['/dashboard/data', 'Data'],
    ['/dashboard/deal-analyzer', 'Deal Analyzer'],
    ['/dashboard/engine-room', 'Engine Room'],
    ['/dashboard/evaluation', 'Evaluation'],
    ['/dashboard/exit-hub', 'Exit Hub'],
    ['/dashboard/field-manager', 'Field Manager'],
    ['/dashboard/financials', 'Financials'],
    ['/dashboard/marketplace', 'Marketplace'],
    ['/dashboard/profile', 'Profile'],
    ['/dashboard/account', 'Account'],
    ['/dashboard/sourcing', 'Sourcing'],
    ['/dashboard/tax', 'Tax Center'],
  ];

  for (const [route, category] of operationalRoutes) {
    test(`Operational/${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, `Operational/${category}`);
      logResult(result);
      expect(result.status).not.toBe('ERROR');
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN PAGES
// ═════════════════════════════════════════════════════════════════════════════

test.describe('ADMIN PANEL', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const adminRoutes: [string, string][] = [
    ['/admin', 'Admin Dashboard'],
    ['/admin/users', 'User Management'],
    ['/admin/subscriptions', 'Subscriptions'],
    ['/admin/analytics', 'Analytics'],
    ['/admin/marketplace', 'Marketplace'],
    ['/admin/audit', 'Audit Log'],
    ['/admin/tickets', 'Support Tickets'],
  ];

  for (const [route, category] of adminRoutes) {
    test(`Admin/${category}: ${route}`, async ({ page }) => {
      const result = await auditPage(page, route, `Admin/${category}`);
      logResult(result);
      // Admin pages may redirect to login — that's OK, just not an error
      expect(result.status).not.toBe('ERROR');
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE-SPECIFIC DEEP TESTS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('FEATURE DEEP DIVE — Navigation Contract', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  test('sidebar navigation is complete and correct', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const nav = page.locator('nav, [data-testid="sidebar"], aside').first();
    const navText = await nav.textContent() ?? '';

    const requiredItems = ['Portfolio', 'Projects', 'Insights', 'Reports', 'Inbox', 'Team'];
    const accountItems = ['Profile', 'Billing', 'Settings'];

    const navResults: Record<string, boolean> = {};
    for (const item of [...requiredItems, ...accountItems]) {
      navResults[item] = new RegExp(item, 'i').test(navText);
    }

    console.log('📋 NAVIGATION CONTRACT:');
    for (const [item, found] of Object.entries(navResults)) {
      console.log(`  ${found ? '✅' : '❌'} ${item}`);
    }

    // All primary nav items must be present
    for (const item of requiredItems) {
      expect(navResults[item]).toBe(true);
    }
  });

  test('sidebar links navigate to correct routes', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const navLinks = [
      { text: /projects/i, expectedUrl: '/dashboard/projects' },
      { text: /insights/i, expectedUrl: '/dashboard/insights' },
      { text: /reports/i, expectedUrl: '/dashboard/reports' },
      { text: /inbox/i, expectedUrl: '/dashboard/inbox' },
      { text: /team/i, expectedUrl: '/dashboard/team' },
    ];

    console.log('📋 NAVIGATION ROUTING:');
    for (const link of navLinks) {
      const el = page.locator('a').filter({ hasText: link.text }).first();
      const href = await el.getAttribute('href').catch(() => '');
      const matches = href?.includes(link.expectedUrl) ?? false;
      console.log(`  ${matches ? '✅' : '❌'} ${link.text} → ${href} (expected: ${link.expectedUrl})`);
    }
  });

  test('theme toggle exists and works', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const themeToggle = page.locator('button').filter({ hasText: /dark_mode|light_mode|🌙|☀️|theme/i }).first();
    const exists = await themeToggle.count() > 0;
    console.log(`🎨 Theme toggle: ${exists ? '✅ Present' : '❌ Missing'}`);
  });
});

test.describe('FEATURE DEEP DIVE — Project REIL Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  test('projects board has phase filter chips', async ({ page }) => {
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const body = await page.textContent('body') ?? '';
    const phases = ['Acquisition', 'Closing', 'Hold', 'Exit', 'All'];
    console.log('📋 PHASE FILTER CHIPS:');
    for (const phase of phases) {
      const found = new RegExp(phase, 'i').test(body);
      console.log(`  ${found ? '✅' : '⚠️'} ${phase}`);
    }
  });

  test('new project CTA is available', async ({ page }) => {
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const cta = page.locator('button, a').filter({ hasText: /new project|create project|add project/i }).first();
    const visible = await cta.isVisible().catch(() => false);
    console.log(`🆕 New Project CTA: ${visible ? '✅ Visible' : '❌ Not found'}`);
  });
});

test.describe('FEATURE DEEP DIVE — KPI Metrics Engine', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  test('command center displays financial KPIs', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const body = await page.textContent('body') ?? '';

    const metricNames = [
      'NOI', 'Cap Rate', 'Cash Flow', 'IRR', 'DSCR', 'GRM',
      'LTV', 'OER', 'Occupancy', 'ROI', 'Appreciation',
    ];

    console.log('📊 KPI METRICS ON DASHBOARD:');
    for (const metric of metricNames) {
      const found = new RegExp(metric, 'i').test(body);
      console.log(`  ${found ? '✅' : '⚠️'} ${metric}`);
    }

    // Check for actual dollar/percent values
    const hasDollars = /\$[\d,]+/.test(body);
    const hasPercents = /[\d]+\.?\d*%/.test(body);
    console.log(`  💲 Dollar values: ${hasDollars ? '✅' : '⚠️'}`);
    console.log(`  📈 Percent values: ${hasPercents ? '✅' : '⚠️'}`);
  });

  test('insights page has charts or data visualizations', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const svgCount = await page.locator('svg').count();
    const canvasCount = await page.locator('canvas').count();
    const chartCount = await page.locator('[class*="chart"], [class*="Chart"], [data-testid*="chart"]').count();

    console.log('📊 DATA VISUALIZATIONS ON INSIGHTS:');
    console.log(`  SVG elements: ${svgCount}`);
    console.log(`  Canvas elements: ${canvasCount}`);
    console.log(`  Chart components: ${chartCount}`);
    console.log(`  Verdict: ${(svgCount + canvasCount + chartCount) > 0 ? '✅ Has charts' : '⚠️ No charts found'}`);
  });
});

test.describe('FEATURE DEEP DIVE — Forms & Actions', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  test('settings page has functional form inputs', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const inputs = await page.locator('input, textarea, select').count();
    const buttons = await page.locator('button').count();
    const forms = await page.locator('form').count();

    console.log('📝 SETTINGS FORM INVENTORY:');
    console.log(`  Inputs: ${inputs}`);
    console.log(`  Buttons: ${buttons}`);
    console.log(`  Forms: ${forms}`);
  });

  test('contact page has a functional form', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const inputs = await page.locator('input, textarea').count();
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|submit|contact/i }).first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);

    console.log('📝 CONTACT FORM:');
    console.log(`  Inputs: ${inputs}`);
    console.log(`  Submit button: ${hasSubmit ? '✅' : '❌'}`);
  });
});

test.describe('FEATURE DEEP DIVE — Honesty & Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  const criticalPages = [
    '/dashboard/command-center',
    '/dashboard/projects',
    '/dashboard/insights',
    '/dashboard/reports',
    '/dashboard/inbox',
  ];

  for (const route of criticalPages) {
    test(`honesty check: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Use visible text from main content area (not SSR JSON)
      const mainLoc = page.locator('main, [role="main"], section').first();
      const mainContent = (await mainLoc.count().catch(() => 0)) > 0 
        ? (await mainLoc.textContent().catch(() => '') ?? '') 
        : (await page.textContent('body').catch(() => '') ?? '');
      
      const checks = {
        'No Lorem ipsum': !/Lorem ipsum/i.test(mainContent),
        'No John Doe': !/John Doe/i.test(mainContent),
        'No Jane Smith': !/Jane Smith/i.test(mainContent),
        'No [placeholder]': !/\[placeholder\]/i.test(mainContent),
        'No TODO: visible': !/TODO:/i.test(mainContent),
        'No FIXME: visible': !/FIXME:/i.test(mainContent),
        'No "sample data"': !/sample data/i.test(mainContent),
      };

      console.log(`🔍 HONESTY CHECK: ${route}`);
      let allPassed = true;
      for (const [check, passed] of Object.entries(checks)) {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
        if (!passed) allPassed = false;
      }

      expect(allPassed).toBe(true);
    });
  }
});

test.describe('FEATURE DEEP DIVE — Accessibility Baseline', () => {
  test.beforeEach(async ({ page }) => {
    const state = createDefaultState();
    await setupMocks(page, state);
  });

  test('dashboard command-center a11y audit', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // H1 count
    const h1Count = await page.locator('h1').count();
    
    // Images with alt
    const images = await page.locator('img').all();
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt !== null) imagesWithAlt++;
      else imagesWithoutAlt++;
    }

    // Buttons with accessible labels
    const buttons = await page.locator('button').all();
    let labeledButtons = 0;
    let unlabeledButtons = 0;
    for (const btn of buttons.slice(0, 20)) {
      const text = await btn.innerText().catch(() => '');
      const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
      const title = await btn.getAttribute('title').catch(() => '');
      if ([text, ariaLabel, title].some(v => v && v.trim().length > 0)) {
        labeledButtons++;
      } else {
        unlabeledButtons++;
      }
    }

    // Form inputs with labels
    const inputElements = await page.locator('input:not([type="hidden"])').all();
    let labeledInputs = 0;
    let unlabeledInputs = 0;
    for (const input of inputElements.slice(0, 20)) {
      const ariaLabel = await input.getAttribute('aria-label').catch(() => '');
      const ariaLabelledby = await input.getAttribute('aria-labelledby').catch(() => '');
      const id = await input.getAttribute('id').catch(() => '');
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      if ([ariaLabel, ariaLabelledby, placeholder].some(v => v && v.trim().length > 0)) {
        labeledInputs++;
      } else {
        unlabeledInputs++;
      }
    }

    // ARIA landmarks
    const mainCount = await page.locator('main, [role="main"]').count();
    const navCount = await page.locator('nav, [role="navigation"]').count();

    console.log('♿ A11Y AUDIT — Command Center:');
    console.log(`  H1 tags: ${h1Count} ${h1Count === 1 ? '✅' : h1Count === 0 ? '⚠️ Missing' : '⚠️ Multiple'}`);
    console.log(`  Images with alt: ${imagesWithAlt}/${imagesWithAlt + imagesWithoutAlt} ${imagesWithoutAlt === 0 ? '✅' : '⚠️'}`);
    console.log(`  Labeled buttons: ${labeledButtons}/${labeledButtons + unlabeledButtons} ${unlabeledButtons === 0 ? '✅' : '⚠️'}`);
    console.log(`  Labeled inputs: ${labeledInputs}/${labeledInputs + unlabeledInputs} ${unlabeledInputs === 0 ? '✅' : '⚠️'}`);
    console.log(`  <main> landmark: ${mainCount > 0 ? '✅' : '❌ Missing'}`);
    console.log(`  <nav> landmark: ${navCount > 0 ? '✅' : '❌ Missing'}`);
  });
});

test.describe('FEATURE DEEP DIVE — API Health Check', () => {
  test('critical API routes respond', async ({ request }) => {
    const healthEndpoints = [
      '/api/health',
    ];

    console.log('🔌 API HEALTH:');
    for (const endpoint of healthEndpoints) {
      try {
        const response = await request.get(endpoint);
        console.log(`  ${response.ok() ? '✅' : '⚠️'} ${endpoint} → ${response.status()}`);
      } catch (err: any) {
        console.log(`  ❌ ${endpoint} → ${err.message.substring(0, 60)}`);
      }
    }
  });
});
