import { test, expect } from '@playwright/test';
import { setupMocks } from './mocks';
import { seedFunnelData, cleanupFunnelData } from './dbFixture';

test.describe('2.1 — Seeded End-to-End Funnel Test', () => {
  test.describe.configure({ mode: 'serial' });

  const orgId = `org_test_funnel_${Date.now()}`;

  let token = '';

  // 1. Seed database before running any tests
  test.beforeAll(async () => {
    console.log(`[E2E Funnel] Seeding database for org ID: ${orgId}...`);
    const seedResult = await seedFunnelData(orgId);
    token = seedResult?.customToken || '';
    console.log('[E2E Funnel] Seeding completed.');
  });

  // 2. Clean up database after all tests complete
  test.afterAll(async () => {
    console.log(`[E2E Funnel] Cleaning up database for org ID: ${orgId}...`);
    await cleanupFunnelData(orgId);
    console.log('[E2E Funnel] Clean up completed.');
  });

  // 3. Set up browser cookies and disable Firestore interception
  test.beforeEach(async ({ page }) => {
    // Capture and print browser console messages to the node runner process output
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    page.on('requestfailed', request => {
      console.log(`[Request Failed] URL: ${request.url()} | Error: ${request.failure()?.errorText || 'unknown'}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[Response Error] URL: ${response.url()} | Status: ${response.status()}`);
      }
    });

    // Navigate to a blank page first to establish local origin context so we can set localStorage
    await page.goto('/login');

    // Sign in client-side using the custom token so that Firestore Client SDK sends credentials
    if (token) {
      await page.evaluate(async (customToken) => {
        if ((window as any).signInWithCustomTokenForE2E) {
          await (window as any).signInWithCustomTokenForE2E(customToken);
        }
      }, token);

      // Wait for session cookie sync to complete on the server-side to prevent ERR_ABORTED navigation race conditions
      await page.waitForFunction(() => (window as any).__sessionSyncCompleted === true || (window as any).__sessionSyncFailed, { timeout: 15000 });
    }

    await page.evaluate((org) => {
      window.localStorage.setItem('pw_active_tenant_id', org);
    }, orgId);

    // Add mock auth session and E2E cookies, and point useAuth to our seeded orgId
    await page.context().addCookies([
      {
        name: '__session',
        value: 'mock_session_token_123',
        domain: 'localhost',
        path: '/',
      },
      {
        name: '__e2e_test',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
      {
        name: '__org',
        value: orgId,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Use setupMocks with allowFirestore and allowAuthRefreshes options to allow direct Firebase connections
    await setupMocks(page, { projects: [], notifications: [], auditLogs: [], vendorRequests: [], gdprDeleted: false } as any, {
      allowFirestore: true,
      allowAuthRefreshes: true,
    });
  });

  // ── Step 1: Dashboard Portfolio (top of the funnel) ──────────────────────────
  test('Step 1 — Dashboard Portfolio loads and aggregates KPIs correctly', async ({ page }) => {
    await page.goto('/dashboard/command-center');
    await page.waitForSelector('nav, [data-testid="sidebar"], h1, h2', { timeout: 15000 });

    // Assert that the page title or main heading is present
    await expect(page.locator('h1').filter({ hasText: /portfolio|command/i }).first()).toBeVisible();

    // The project cards should be rendered from live Firestore, not empty state
    await expect(page.locator('body')).not.toContainText('No deals yet');

    // Confirm our seeded properties are visible in the pipeline list
    await expect(page.locator('text=Oakridge Apartments').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Pinecrest Apartments').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ocean View Condos').first()).toBeVisible({ timeout: 10000 });

    // Verify 5 KPI cards render with seeded aggregates
    // 1. Capital Deployed: down payments of A ($80K) + B ($100K) + C ($100K) = $280K
    const capCardValue = page.locator('[aria-label="Portfolio health metrics"] >> text=$280K');
    await expect(capCardValue).toBeVisible();

    // 2. Total NOI: Oakridge ($44,664) + Pinecrest ($15,600) = $60,264/yr
    const noiCardValue = page.locator('[aria-label="Portfolio health metrics"] >> text=$60K');
    await expect(noiCardValue).toBeVisible();

    // 3. Monthly Cash Flow: Oakridge ($1,593.92) + Pinecrest (-$2,544.57) = -$950.65/mo
    const cfCardValue = page.locator('[aria-label="Portfolio health metrics"] >> text=-$951');
    await expect(cfCardValue).toBeVisible();

    // 4. Portfolio IRR: computed blended yield should be visible and not empty
    const irrCard = page.locator('text=Portfolio IRR');
    await expect(irrCard).toBeVisible();
    await expect(page.locator('[aria-label="Portfolio health metrics"]')).toContainText('%');

    // 5. Equity Multiple: computed aggregate should be visible
    const emCard = page.locator('text=Equity Multiple');
    await expect(emCard).toBeVisible();
    await expect(page.locator('[aria-label="Portfolio health metrics"]')).toContainText('×');
  });

  // ── Step 2: Insights (mid-funnel) ───────────────────────────────────────────
  test('Step 2 — Insights tabs render and Stress Simulator updates pro-forma grid', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForSelector('button:has-text("Stress Simulator")', { timeout: 15000 });

    // Ensure the empty state is NOT showing
    await expect(page.locator('body')).not.toContainText('No Investments Sourced Yet');

    // Tab 1: KPI Overview is default
    await expect(page.locator('text=Capitalization Rate').first()).toBeVisible();
    await expect(page.locator('text=Cash-on-Cash Return').first()).toBeVisible();
    await expect(page.locator('text=Operating Expense Ratio').first()).toBeVisible();

    // Tab 2: Deep Analysis
    const analysisTab = page.locator('button:has-text("Deep Analysis")');
    await analysisTab.click();
    await expect(page.locator('text=Short-Term Historical Trend').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Secondary Diagnostics & Operational Context').first()).toBeVisible({ timeout: 8000 });

    // Tab 3: Stress Simulator
    const stressTab = page.locator('button:has-text("Stress Simulator")');
    await stressTab.click();
    await expect(page.locator('text=Underwriting Stress Test Simulator').first()).toBeVisible({ timeout: 8000 });

    // Verify Risk Stress Tester is loaded
    await expect(page.locator('text=Risk Stress Tester').first()).toBeVisible();

    // Let's assert that the short-term and long-term gauges/charts are visible
    await expect(page.locator('text=Short-Term Health Gauges').first()).toBeVisible();
    await expect(page.locator('text=Long-Term Growth Trajectories').first()).toBeVisible();

    // Select the Downturn preset and assert that the values update
    await page.selectOption('select:has-text("Market Downturn")', 'downturn');

    // Wait a brief moment for calculation to update the spreadsheet-like grid
    await page.waitForTimeout(500);

    // Verify the preset state description updates to downturn
    await expect(page.locator('text=Carry Stress Detected').first()).toBeVisible();
  });

  // ── Step 3: Individual Metric Deep Dives ──────────────────────────────────
  test('Step 3 — Individual metric deep-dives render graphs and details correctly', async ({ page }) => {
    // 1. Visit NOI detail route
    await page.goto('/dashboard/intelligence/noi');
    await page.waitForSelector('h1:has-text("NOI Detail")', { timeout: 15000 });
    await expect(page.locator('text=NOI Components').first()).toBeVisible();
    await expect(page.locator('.echarts-for-react')).toBeVisible();

    // 2. Visit DSCR detail route
    await page.goto('/dashboard/intelligence/dscr');
    await page.waitForSelector('h1:has-text("DSCR Intelligence")', { timeout: 15000 });
    await expect(page.locator('text=DSCR Threshold Analysis').first()).toBeVisible();
  });

  // ── Step 4: Data Room (bottom of the funnel) ─────────────────────────────────
  test('Step 4 — Data Room comparison matrix loads and lists closing disclosures', async ({ page }) => {
    await page.goto('/dashboard/data-room');
    await page.waitForSelector('h1:has-text("Data Room")', { timeout: 15000 });

    // Check matrix is loaded with seeded properties
    await expect(page.locator('text=Asset Comparison Matrix').first()).toBeVisible();
    await expect(page.locator('text=Oakridge Apartments').first()).toBeVisible();
    await expect(page.locator('text=Pinecrest Apartments').first()).toBeVisible();

    // Verify headers for supplemental metrics are visible
    await expect(page.locator('th:has-text("LTV")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Debt Yield")').first()).toBeVisible();
    await expect(page.locator('th:has-text("BE Occ")').first()).toBeVisible();

    // Verify the comparison values are visible (e.g. Cap Rate, Cash Flow, DSCR, OER)
    await expect(page.locator('td:has-text("8.93%")')).toBeVisible();
    await expect(page.locator('td:has-text("2.60%")')).toBeVisible();

    // Verify Stacked Charts render
    await expect(page.locator('text=NOI Trend by Property').first()).toBeVisible();
    await expect(page.locator('text=Cash Flow Waterfall').first()).toBeVisible();
  });

  // ── Step 5: Honesty-Rule Absence Guardrail (P1 negative-path checks) ────────
  test('Step 5 — Honesty-Rule negative-path assertions', async ({ page }) => {
    // 1. Plaid: Mock-mode check & feed stale badge
    const plaidProviderDefault = process.env.PLAID_PROVIDER || 'real';
    expect(plaidProviderDefault).not.toBe('mock');

    // Go to Insights first
    await page.goto('/dashboard/insights');
    await page.waitForSelector('button:has-text("Deep Analysis")', { timeout: 15000 });

    const bodyText = await page.textContent('body');
    // Assert that no unconfirmed Plaid transactions appear in KPIs
    expect(bodyText).not.toContain('unconfirmed transaction');
    expect(bodyText).not.toContain('low-confidence');

    // Assert that stale feed warning is not showing
    expect(bodyText).not.toContain('Plaid sync stale');

    // 2. Missed-rent: Attention signal wording & STR checks
    await page.click('button:has-text("Deep Analysis")');
    const analysisBodyText = await page.textContent('body');

    // Assert that the alert text for missed rent does not make false assertions (e.g. "tenant has not paid")
    // but only says "no matching transaction observed"
    expect(analysisBodyText).not.toContain('tenant has not paid');
    expect(analysisBodyText).not.toContain('tenant failed to pay');

    // Assert STR projects do not emit missed rent signal
    // (Ocean View Condos is a Phase 1 / STR strategy project and should not show any missed rent warnings)
    const strMissedRent = page.locator('text=Ocean View Condos >> text=missed-rent');
    await expect(strMissedRent).not.toBeVisible();

    // 3. Supplemental metrics: Insufficient inputs locked states & no simple averages
    // Verify that locked or incomplete cards render honest locks or missing fields warnings, never a confident zero
    const lockedCards = page.locator('text=Unlocks in phase');
    const incompleteCards = page.locator('text=Incomplete: requires');
    
    const hasLocked = await lockedCards.count() > 0;
    const hasIncomplete = await incompleteCards.count() > 0;
    expect(hasLocked || hasIncomplete).toBe(true);

    // 4. Crowdfunding: KYC / Escrow / Payment fields absence
    // Assert that no payment, escrow, or KYC fields exist in the crowdfunding flow
    await page.goto('/dashboard/projects');
    await page.click('text=Oakridge Apartments');
    await page.waitForSelector('text=Crowdfunding', { timeout: 15000 });

    const crowdfundBodyText = await page.textContent('body');
    expect(crowdfundBodyText).not.toContain('KYC');
    expect(crowdfundBodyText).not.toContain('escrow account');
    expect(crowdfundBodyText).not.toContain('payment gateway');
  });
});
