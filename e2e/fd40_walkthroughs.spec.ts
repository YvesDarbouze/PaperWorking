import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';

test.use({
  video: 'on',
  screenshot: 'on',
});

test.describe('FD-40 — Full-Phase E2E Walkthroughs', () => {

  test('Walkthrough 1: Conventional Mortgage Solo (FX-1 spine)', async ({ page, context }) => {
    test.setTimeout(90000);

    const state = createDefaultState();
    state.plan = 'individual';
    
    // Seed project Evergreen Terrace matching FX-1 spine
    state.projects = [
      {
        id: 'evergreen_terrace',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        currentPhase: 1, // Sourcing / Acquisition
        status: 'Active',
        dispositionType: 'RENT',
        financials: {
          purchasePrice: 27900000,
          estimatedARV: 32000000,
          projectedRehabCost: 3500000,
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanAmount: 22320000,
          monthlyGrossRent: 1950,
          vacancyRatePercent: 7,
          tax: 200,
          insurance: 58,
          utilities: 125,
          management_pct: 10,
          maintenance_pct: 10,
          totalCashInvested: 6000000,
          offerStatus: 'Accepted',
          finalAgreedPrice: 27900000,
          scorecardAcknowledged: true,
          psaEffectiveDate: '2026-07-14',
          psaDdEndDate: '2026-07-28',
          psaClosingDate: '2026-08-13',
          psaDocumentUrl: '/mock/documents/Executed_PSA_Signed.pdf',
          psaDocumentName: 'Executed_PSA_Signed.pdf',
          emdEscrowHolder: 'First American Title',
          emdDueDate: '2026-07-17',
          emdVerified: true,
          emdReceiptUrl: '/mock/documents/Earnest_Money_Receipt_Signed.pdf',
          emdReceiptName: 'Earnest_Money_Receipt_Signed.pdf',
        },
        members: {
          user_123: { role: 'owner' },
          user_lead_investor_seed: { role: 'owner' },
        },
        fundingPlan: {
          modality: ['solo_cash', 'conventional_loan'],
        },
        createdAt: new Date().toISOString(),
      }
    ];

    // Mock header/payload JWT token
    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: '123' })).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockPayload = Buffer.from(JSON.stringify({
      iss: 'https://securetoken.google.com/paperworking-97055',
      aud: 'paperworking-97055',
      auth_time: Math.floor(Date.now() / 1000) - 60,
      user_id: 'user_lead_investor_seed',
      sub: 'user_lead_investor_seed',
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'marcus@apexcapital.io',
      email_verified: true,
    })).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockJwt = `mock_${mockHeader}.${mockPayload}.signature`;

    await setupMocks(page, state, { allowAuthRefreshes: true });

    await page.route('**/securetoken.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_token: mockJwt,
          access_token: mockJwt,
          refresh_token: 'mock_refresh_token_123',
          expires_in: '3600',
          user_id: 'user_123',
          project_id: 'paperworking-97055',
          token_type: 'Bearer',
        }),
      });
    });

    await page.route('**/accounts:signInWithPassword**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          localId: 'user_123',
          email: 'user@example.com',
          displayName: 'Test User',
          idToken: mockJwt,
          registered: true,
          refreshToken: 'mock_refresh_token_123',
          expiresIn: '3600',
        }),
      });
    });

    // Set cookie bypass and auth tokens
    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' }
    ]);

    // Go to project dashboard page
    await page.goto('/dashboard/projects/evergreen_terrace');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/wt1-01-project-details.png' });
    console.log('WT1: Landed on project detail page.');

    // Simulate clicking complete acquisition to proceed to fund/closing phase
    // In our app, if the project is Phase 1, we can manually navigate to the Phase 2 page or trigger the transition.
    // Let's set project phase to 2 (Fund Phase) in state so it mounts the closing workspace.
    state.projects[0].currentPhase = 2;

    await page.goto('/dashboard/projects/evergreen_terrace/phase-2');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/wt1-02-fund-phase.png' });
    console.log('WT1: Mounted Fund phase closing board.');

    // Verify presence of columns
    await expect(page.locator('text=Capital Plan').first()).toBeVisible();
    await expect(page.locator('text=Debt').first()).toBeVisible();
    await expect(page.locator('text=Title & Closing Team').first()).toBeVisible();
    await expect(page.locator('text=Closing').first()).toBeVisible();
    await expect(page.locator('text=Fund Wrap').first()).toBeVisible();

    // Verify strategyType is absent and dispositionType Rent is used
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).not.toContain('strategyType');
    expect(bodyText).not.toContain('Purchase'); // Should use Fund instead of Purchase

    console.log('WT1 Verification: "strategyType" and "Purchase" labels are absent as required.');
  });

  test('Walkthrough 2: Syndication & Debt Hybrid', async ({ page, context }) => {
    test.setTimeout(90000);

    const state = createDefaultState();
    state.plan = 'team';
    
    // Seed project Ocean View Apartments as a syndication project
    state.projects = [
      {
        id: 'ocean_view',
        propertyName: 'Ocean View Apartments',
        address: '100 Ocean Drive',
        currentPhase: 2, // Fund Phase
        status: 'Active',
        dispositionType: 'RENT',
        financials: {
          purchasePrice: 120000000,
          estimatedARV: 150000000,
          projectedRehabCost: 15000000,
          financingType: 'Financed',
          downPaymentPercent: 25,
          loanInterestRate: 5.5,
          loanTermYears: 25,
          loanAmount: 90000000,
          monthlyGrossRent: 9500,
          vacancyRatePercent: 5,
          totalCashInvested: 35000000,
          finalAgreedPrice: 120000000,
        },
        members: {
          user_123: { role: 'owner' },
          user_lead_investor_seed: { role: 'owner' },
        },
        fundingPlan: {
          modality: ['syndication_equity', 'conventional_loan'],
        },
        equityParties: [
          {
            id: 'lp1',
            projectId: 'ocean_view',
            role: 'LP',
            name: 'LP 1',
            email: 'lp1@example.com',
            entityType: 'Individual',
            ownershipPct: 40.0,
            phasePermissions: {
              'phase-1': { canView: true, canEdit: false },
              'phase-2': { canView: true, canEdit: false },
              'phase-3': { canView: true, canEdit: false },
              'phase-4': { canView: true, canEdit: false }
            }
          },
          {
            id: 'lp2',
            projectId: 'ocean_view',
            role: 'LP',
            name: 'LP 2',
            email: 'lp2@example.com',
            entityType: 'Individual',
            ownershipPct: 20.0,
            phasePermissions: {
              'phase-1': { canView: true, canEdit: false },
              'phase-2': { canView: true, canEdit: false },
              'phase-3': { canView: true, canEdit: false },
              'phase-4': { canView: true, canEdit: false }
            }
          }
        ],
        createdAt: new Date().toISOString(),
      }
    ];

    // Mock header/payload JWT token
    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: '123' })).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockPayload = Buffer.from(JSON.stringify({
      iss: 'https://securetoken.google.com/paperworking-97055',
      aud: 'paperworking-97055',
      auth_time: Math.floor(Date.now() / 1000) - 60,
      user_id: 'user_lead_investor_seed',
      sub: 'user_lead_investor_seed',
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'marcus@apexcapital.io',
      email_verified: true,
    })).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mockJwt = `mock_${mockHeader}.${mockPayload}.signature`;

    await setupMocks(page, state, { allowAuthRefreshes: true });

    await page.route('**/securetoken.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_token: mockJwt,
          access_token: mockJwt,
          refresh_token: 'mock_refresh_token_123',
          expires_in: '3600',
          user_id: 'user_123',
          project_id: 'paperworking-97055',
          token_type: 'Bearer',
        }),
      });
    });

    await page.route('**/accounts:signInWithPassword**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          localId: 'user_123',
          email: 'user@example.com',
          displayName: 'Test User',
          idToken: mockJwt,
          registered: true,
          refreshToken: 'mock_refresh_token_123',
          expiresIn: '3600',
        }),
      });
    });

    await context.addCookies([
      { name: '__session', value: 'mock_session_token_123', domain: 'localhost', path: '/' },
      { name: '__acct', value: 'investor', domain: 'localhost', path: '/' },
      { name: '__e2e_test', value: '1', domain: 'localhost', path: '/' }
    ]);

    await page.goto('/dashboard/projects/ocean_view/phase-2');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/wt2-01-syndication-board.png' });
    console.log('WT2: Landed on syndication project page in Phase 2.');

    // Open the F2.1 Parties card to display the roster
    await page.locator('text=F2.1').first().click();
    await page.waitForTimeout(2000);

    // Verify roster has LP 1 and LP 2
    const bodyText = await page.textContent('body') || '';
    expect(bodyText).toContain('LP 1');
    expect(bodyText).toContain('LP 2');

    console.log('WT2 Verification: LP roster seeded and rendered correctly.');
  });
});
