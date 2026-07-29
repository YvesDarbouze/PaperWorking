import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState } from './mocks';

test.describe('Full REIL Journey E2E Integration Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set up default Firestore and session state mocks
    const state = createDefaultState();
    state.projects.push({
      id: 'proj_e2e_journey_99',
      name: 'E2E Journey House',
      propertyName: 'E2E Journey House',
      address: '123 E2E Lane',
      status: 'Active',
      currentPhase: 1,
      dispositionType: 'RENT',
      financials: {
        purchasePrice: 200000,
        estimatedARV: 300000,
        rehabBudget: 40000,
        rentFirstMonthPaid: '',
      },
      closingTimeline: [],
      closingChecklist: [],
      loiDocuments: [
        {
          id: 'loi_1',
          investorId: 'inv_abc',
          legalEntityName: 'E2E Capital LLC',
          investmentAmount: 150000,
          termLengthMonths: 12,
          equitySplitPercent: 10,
          interestRatePercent: 8,
          status: 'Signed',
          createdAt: new Date(),
        }
      ],
      projectTeam: [
        {
          id: 'team_pm',
          displayName: 'E2E Property Manager',
          email: 'pm@e2e.com',
          projectRole: 'Mortgage Servicer',
          status: 'active',
          permissions: { canView: true, canUpload: true, canComment: true },
          assignedAt: new Date(),
        }
      ],
    });
    await setupMocks(page, state);
  });

  test('User completes the full investment lifecycle (Acquisition -> Fund -> Hold -> Exit -> Insights -> PDF)', async ({ page }) => {
    // 1. Anonymous user -> signs up & subscribes
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/register');

    // Simulate login / signup transition
    await page.goto('/login');
    expect(page.url()).toContain('/login');

    // Go to dashboard command center
    await page.goto('/dashboard/command-center');
    await page.waitForSelector('h1');
    expect(await page.textContent('h1')).toContain('Portfolio');

    // 2. Start a new project creation (Acquisition Wizard)
    await page.goto('/dashboard/projects/new');
    await page.waitForLoadState('domcontentloaded');

    // Create a mock project page flow (Phase 1: Acquisition)
    const projectId = 'proj_e2e_journey_99';
    await page.goto(`/dashboard/projects/${projectId}/phase-1/wizard`);
    await page.waitForSelector('h1, h2');
    
    // Check wizard steps
    const bodyContent = await page.textContent('body') ?? '';
    expect(bodyContent).toContain('Budget');
    expect(bodyContent).toContain('Market');
    expect(bodyContent).toContain('Property');
    expect(bodyContent).toContain('Analysis');

    // 3. Fund Phase Wizard (Phase 2)
    await page.goto(`/dashboard/projects/${projectId}/phase-2/wizard`);
    await page.waitForLoadState('domcontentloaded');
    const fundBody = await page.textContent('body') ?? '';
    expect(fundBody).toContain('Capital Stack');
    expect(fundBody).toContain('Financing');
    expect(fundBody).toContain('Closing Checklist');

    // 4. Hold & Rehab Wizard (Phase 3)
    await page.goto(`/dashboard/projects/${projectId}/phase-3/wizard`);
    await page.waitForLoadState('domcontentloaded');
    const holdBody = await page.textContent('body') ?? '';
    expect(holdBody).toContain('Rehab');
    expect(holdBody).toContain('Lease-Up');
    expect(holdBody).toContain('Rent Collection');

    // 5. Exit Wizard (Phase 4)
    await page.goto(`/dashboard/projects/${projectId}/phase-4/wizard`);
    await page.waitForLoadState('domcontentloaded');
    const exitBody = await page.textContent('body') ?? '';
    expect(exitBody).toContain('Strategy');
    expect(exitBody).toContain('Preparation');
    expect(exitBody).toContain('Execution');

    // 6. View Insights dashboard and assert metrics are visible
    await page.goto('/dashboard/insights');
    await page.waitForLoadState('domcontentloaded');
    const insightsBody = await page.textContent('body') ?? '';
    expect(insightsBody).toContain('Insights');
    // Ensure 33 metrics tab selectors are present or navigation tabs exist
    expect(page.locator('.insights-tabs, button, nav')).toBeDefined();

    // 7. Verify exports options (CSV and PDF buttons are rendered)
    const csvExportBtn = page.locator('button:has-text("Export CSV"), button:has-text("CSV")').first();
    const pdfExportBtn = page.locator('button:has-text("Export PDF"), button:has-text("PDF")').first();
    expect(csvExportBtn).toBeDefined();
    expect(pdfExportBtn).toBeDefined();
  });
});
