import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto, MockState } from './mocks';

test.describe('Agent 5: Reports, Portfolio & Visualization Dashboard E2E', () => {
  let state: MockState;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem(
          'pw_cookie_consent',
          JSON.stringify({ essential: true, analytics: true, marketing: true })
        );
      } catch (e) {}
    });
    state = createDefaultState();
    await setupMocks(page, state);

    // Mock portfolio reports API endpoint
    await page.route('**/api/reports/portfolio*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          period: 'overall',
          narrative: 'Executive Summary: Portfolio has generated $274,000 in capital gains with a 24.6% ROI.',
          overview: {
            activeProjects: 3,
            portfolioValue: 1250000,
            cashInvested: 450000,
            totalReturns: 274000,
            portfolioROI: 24.6,
            avgDaysHeld: 185,
          },
          kpis33: {
            offersSentTotal: 42,
            responseRatePct: 64.2,
            avgOfferAmount: 285000,
            dealsUnderContract: 4,
            acceptanceRatePct: 21.5,
            crowdfundingRaisedTotal: 450000,
            investorCountTotal: 12,
            avgClosingDays: 28,
            loanApprovalRatePct: 92.0,
            docCompletionRatePct: 98.5,
            totalClosingCosts: 48500,
            totalOriginationFees: 12500,
            totalTitleInsurance: 6400,
            avgDailyHoldingCost: 142.5,
            rehabOverrunPct: 4.2,
            rentalOccupancyRatePct: 96.8,
            cashOnCashReturnPct: 14.8,
            capRatePct: 8.4,
            monthlyGrossRentTotal: 28400,
            monthlyExpensesTotal: 11200,
            avgDaysOnMarket: 34,
            saleToListRatioPct: 98.2,
            avgNetProfitPerDeal: 68500,
            annualizedROIPct: 24.6,
            totalCapitalGains: 274000,
            exchange1031RatePct: 75.0,
            totalExitRevenue: 1420000,
            estQuarterlyTaxLiability: 18400,
            ytdDepreciationTotal: 42500,
            total1099sIssued: 8,
            scheduleENetIncomeTotal: 84200,
            safeHarborMetPct: 100,
            totalTaxDocumentsGenerated: 14,
          },
        }),
      });
    });
  });

  test('Renders Insights 33 KPIs and Reports tab with PDF/CSV export capability', async ({ page }) => {
    // 1. Navigate to Insights Tab
    await safeGoto(page, '/dashboard/insights');
    const insightsTab = page.getByTestId('insights-tab');
    await expect(insightsTab).toBeVisible({ timeout: 15000 });

    // Verify 33 KPIs categories render
    await expect(page.getByText(/33 KPIs/i).first()).toBeVisible();
    await expect(page.getByText(/Offers Sent/i).first()).toBeVisible();
    await expect(page.getByText(/Est. Quarterly Tax/i).first()).toBeVisible();

    // 2. Navigate to Reports Tab
    await safeGoto(page, '/dashboard/reports');
    const reportsTab = page.getByTestId('reports-tab');
    await expect(reportsTab).toBeVisible({ timeout: 15000 });

    // Verify Period Tab switcher
    const quarterlyTab = page.getByTestId('period-tab-quarterly');
    await expect(quarterlyTab).toBeVisible();
    await quarterlyTab.click();

    // Verify PDF and CSV export buttons
    const exportPdfBtn = page.getByTestId('export-pdf-btn');
    await expect(exportPdfBtn).toBeVisible();
    await exportPdfBtn.click();

    const exportCsvBtn = page.getByTestId('export-csv-btn');
    await expect(exportCsvBtn).toBeVisible();
    await exportCsvBtn.click();
  });
});
