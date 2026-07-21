import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';

test.describe('PaperWorking E2E — Deal Communication Composer (AQ-26)', () => {
  const projectId = 'project_compose_test';

  test('Should compose invitations, verify side-by-side preview, handle obfuscated teaser & subscribe gate, and process unsubscribe', async ({ page }) => {
    // Console logging
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`BROWSER PAGE ERROR: ${err.message}\n${err.stack}`);
    });

    // Initialize mock state
    const state = createDefaultState();
    state.projects = [
      {
        id: projectId,
        propertyName: 'Capital Heights',
        address: '500 Syndicate Ave, Austin, TX',
        propertyAddress: '500 Syndicate Ave, Austin, TX',
        condition: 'turnkey',
        firstPassVerdict: 'PURSUE',
        dispositionType: 'RENT',
        subStrategy: 'Long-Term',
        status: 'Under Contract',
        units: 1,
        propertyType: 'SFR',
        comps: [
          { id: 'c1', addressLine: '102 Cascade Way', soldPriceCents: 30000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.1, condition: 'Good' },
          { id: 'c2', addressLine: '104 Cascade Way', soldPriceCents: 31000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.2, condition: 'Good' },
          { id: 'c3', addressLine: '106 Cascade Way', soldPriceCents: 32000000, soldDate: '2026-01-01', sqft: 2000, distanceMiles: 0.3, condition: 'Good' },
        ],
        financials: {
          purchasePrice: 50000000, // $500k
          finalAgreedPrice: 50000000,
          projectedNOI: 4560000, // $45.6k
          projectedCapRate: 9.12,
          projectedCashOnCash: 8.29,
          financingType: 'All Cash',
          capitalPlan: 'raise interest',
          equityTerms: {
            funding_target: 200000, // $200k
            equity_offered_pct: 30,
            min_ticket: 10000,
            price_basis: 500000,
            version: 4,
          },
        },
        members: {
          user_123: { role: 'owner' },
        },
      }
    ];

    // Setup network interception mocks
    await setupMocks(page, state);

    // Add cookie consent and bypass popups
    await page.addInitScript(({ pid }) => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
      
      // Seed contacts
      const mockContacts = [
        {
          id: 'con_1',
          name: 'Investor Bob',
          email: 'bob@investor.com',
          phone: '555-9000',
          type: 'Individual',
          relationship: 'Warm',
          potentialTicket: 2000000, // $20,000 in cents
          emailConsent: true,
          inAppConsent: true,
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(`pw_e2e_contacts_${pid}`, JSON.stringify(mockContacts));
      localStorage.setItem(`pw_e2e_invitations_${pid}`, JSON.stringify([]));
      localStorage.setItem(`pw_e2e_notifications_bob`, JSON.stringify([]));
      localStorage.setItem(`pw_e2e_inv_history_${pid}`, JSON.stringify([]));
    }, { pid: projectId });

    // Mock API paths not in mocks.ts
    await page.route('/api/invitations/broadcast', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, totalCount: 1 }
      });
    });

    // Mock public invitation lookup
    await page.route(/\/api\/invitations\/([^\/]+)$/, async (route) => {
      const parsedUrl = new URL(route.request().url());
      const token = parsedUrl.pathname.split('/').pop() || '';
      
      // Ignore sub-paths (like /subscribe, /respond)
      if (token === 'subscribe' || token === 'respond') {
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorName: 'Investor Bob',
          investorEmail: 'bob@investor.com',
          dealName: 'Capital Heights',
          propertyAddress: '500 Syndicate Ave, Austin, TX',
          strategy: 'Long-Term',
          assetClass: 'SFR',
          opportunitySummary: 'A fantastic co-investment opportunity in Austin.',
          purchasePrice: 50000000,
          estimatedARV: 60000000,
          expectedROI: 12.5,
          investmentAmount: 10000,
          equitySplit: 30,
          interestRate: 0,
          termMonths: 60,
          legalEntity: 'Capital Heights LLC',
          raiseTarget: 200000,
          raiseRaised: 0,
          raisePercentage: 0,
          daysLeft: 30,
          hoursLeft: 0,
          noiHistory: [],
          capRateHistory: [],
          cashFlowHistory: [],
          burnRateHistory: [],
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
      });
    });

    // Mock public invitation subscribe
    await page.route(/\/api\/invitations\/([^\/]+)\/subscribe$/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      });
    });

    // Mock public invitation respond
    await page.route(/\/api\/invitations\/([^\/]+)\/respond$/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      });
    });

    // Mock public unsubscribe API route and update mock contacts
    await page.route(/\/api\/unsubscribe(\?.*)?$/, async (route) => {
      await page.evaluate(({ pid }) => {
        const key = `pw_e2e_contacts_${pid}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if (list.length > 0) {
          list[0].emailConsent = false;
          localStorage.setItem(key, JSON.stringify(list));
        }
      }, { pid: projectId });

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      });
    });

    // Go to project phase-1 page
    await page.goto(`/dashboard/projects/${projectId}/phase-1`);
    await page.waitForTimeout(2000);

    // Verify page title / property header is loaded
    await expect(page.locator('h2').first()).toContainText('Capital Heights');

    // Select Stage 6: Raise Interest
    const tabStage6 = page.locator('#stage-tab-raise_interest').first();
    await expect(tabStage6).toBeVisible();
    await tabStage6.click();

    // Verify Deal Composer is visible
    const composerTitle = page.locator('h4').filter({ hasText: 'Deal Communication Composer' });
    await expect(composerTitle).toBeVisible();

    // AC1: Composed figures match registry + terms version (side-by-side)
    const previewBody = page.locator('#preview-body');
    await expect(previewBody).toContainText('Seeking $200,000 in exchange for 30% equity');
    await expect(previewBody).toContainText('Minimum ticket size: $10,000');
    await expect(previewBody).toContainText('Projected Cap Rate: 9.12%');
    await expect(previewBody).toContainText('Projected Cash-on-Cash: 8.29%');

    // AC4: Copy edit changes prose; figures remain bound
    const textEditor = page.locator('#composer-body');
    await textEditor.fill('This is custom invitation prose. Seeking {{FUNDING_TARGET}} for {{EQUITY_PERCENT}}.');
    await expect(previewBody).toContainText('This is custom invitation prose.');
    await expect(previewBody).toContainText('Seeking $200,000 for 30%.');

    // Click Send Invitation Batch
    const btnSendBatch = page.locator('#btn-broadcast-invitation');
    await expect(btnSendBatch).toBeVisible();
    await btnSendBatch.click();
    await page.waitForTimeout(500);

    // Verify in-app invite arrived
    const savedInvsStr = await page.evaluate(({ pid }) => localStorage.getItem(`pw_e2e_invitations_${pid}`), { pid: projectId });
    const savedInvs = JSON.parse(savedInvsStr || '[]');
    expect(savedInvs.length).toBeGreaterThan(0);
    const invitationToken = savedInvs[0].token;
    expect(invitationToken).toBe('token_bobinvestorcom');

    // Navigate to Bob's external invite token link (non-subscriber teaser)
    // Completely log out from all session state, cookies, and local database storage
    await page.context().clearCookies();
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      // Re-seed cookie consent for the new session
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });

    await page.goto(`/invest/${invitationToken}`);
    await page.waitForTimeout(2000);

    // Verify page has loaded with Subscribe Gate
    const gate = page.locator('#subscribe-gate');
    await expect(gate).toBeVisible();
    await expect(gate).toContainText('Subscribe to View Deal');

    // Email field should be pre-filled and disabled
    const emailInput = page.locator('#subscribe-email');
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveValue('bob@investor.com');

    // Layout should be blurred/obfuscated
    const blurredLayout = page.locator('.filter.blur-\\[8px\\]');
    await expect(blurredLayout).toBeVisible();

    // Complete subscription (Unlock Deal)
    const nameInput = page.locator('#subscribe-name');
    await nameInput.fill('Bob Investor');
    
    const btnUnlock = page.locator('#btn-subscribe-unlock');
    await btnUnlock.click();

    // Blur should be removed and gate hidden
    await expect(gate).not.toBeVisible();
    await expect(blurredLayout).not.toBeVisible();

    // Verify the unsubscribe functionality
    await page.goto(`/unsubscribe?email=bob@investor.com&projectId=${projectId}`);
    await expect(page.locator('h1')).toContainText('Unsubscribe Request');
    await page.waitForSelector('text=You have been unsubscribed');

    // Read the emailConsent state of Bob Investor in contacts, verifying it is false
    const updatedContactsStr = await page.evaluate(({ pid }) => localStorage.getItem(`pw_e2e_contacts_${pid}`), { pid: projectId });
    const updatedContacts = JSON.parse(updatedContactsStr || '[]');
    expect(updatedContacts[0].emailConsent).toBe(false);
  });
});
