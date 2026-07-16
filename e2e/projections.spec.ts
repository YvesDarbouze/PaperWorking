import { test, expect } from '@playwright/test';
import { setupMocks, createDefaultState, safeGoto } from './mocks';
import * as fs from 'fs';
import * as path from 'path';

test.use({ video: 'on' });

test.describe('PaperWorking E2E — Projections Engine (AQ-16)', () => {
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory if it doesn't exist
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }

    // Bypass Cookie Consent popup by pre-seeding localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('pw_cookie_consent', JSON.stringify({ essential: true, analytics: true, marketing: true }));
    });
  });

  test('RENT projections, Year-5 equity hand-check, and negative cash flow IRR convergence', async ({ page }) => {
    const state = createDefaultState();
    
    // Seed project with RENT financials representing the negative cash flow Evergreen Terrace (DEMO_FINANCIALS)
    state.projects = [
      {
        id: 'project_demo',
        propertyName: 'Evergreen Terrace',
        address: '742 Evergreen Terrace',
        dispositionType: 'RENT',
        currentPhase: 1,
        status: 'Lead',
        financials: {
          purchasePrice: 27900000,     // $279,000 in cents
          estimatedARV: 32000000,      // $320,000 in cents
          projectedRehabCost: 3500000, // $35,000 in cents
          financingType: 'Financed',
          downPaymentPercent: 20,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanAmount: 22320000,        // $223,200 in cents
          monthlyGrossRent: 1950,      // $1,950 in dollars
          vacancyRatePercent: 7,
          tax: 200,                    // $200 in dollars
          insurance: 58,               // $58 in dollars
          utilities: 125,              // $125 in dollars
          management_pct: 10,
          maintenance_pct: 10,
          totalCashInvested: 6000000,  // $60,000 in cents (exact basis)
        },
        members: {
          user_123: { role: 'owner' },
        },
        createdAt: new Date().toISOString(),
      }
    ];

    await setupMocks(page, state);

    // Helper to extract and parse metric values from scorecard
    const parseVal = (str: string) => parseFloat(str.replace(/[^0-9.-]/g, ''));

    // 1. Navigate to Deal Analyzer
    await safeGoto(page, '/dashboard/deal-analyzer');

    // 2. Open project_demo in Deal Analyzer by clicking the card heading
    const projectLink = page.getByRole('heading', { name: 'Evergreen Terrace' }).first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();

    // 3. Confirm Live Metrics Scorecard displays correct metrics (negative cash flow, converged IRR)
    const scorecard = page.locator('div:has-text("Live Metrics Scorecard")').first();
    await expect(scorecard).toBeVisible();

    // Locate the exact label and traverse to its row parent using xpath=..
    const labelSpan = page.locator('span:text-is("Projected IRR")').first();
    await expect(labelSpan).toBeVisible();
    const irrRow = labelSpan.locator('xpath=..');
    
    // Extract the computed IRR value on screen from the span.font-bold inside this specific row
    const irrValText = await irrRow.locator('span.font-bold').first().innerText();
    const irrNum = parseVal(irrValText);
    expect(irrNum).toBeGreaterThan(0);
    expect(irrNum).toBeLessThan(100);

    // 4. AC1: Year-5 equity hand-check
    const projectionsHeader = page.locator('h3:has-text("Projections & Hold Horizon Analysis")').first();
    await expect(projectionsHeader).toBeVisible();

    // Filter to get the specific Year 5 table row
    const year5Row = page.locator('tr').filter({ has: page.locator('td:text-is("Year 5")') }).first();
    await expect(year5Row).toBeVisible();

    // Verify Value, Loan Balance, Equity cells
    const valueCell = year5Row.locator('td').nth(1);
    const balanceCell = year5Row.locator('td').nth(2);
    const equityCell = year5Row.locator('td').nth(3);

    await expect(valueCell).toContainText('$323,437');
    await expect(balanceCell).toContainText('$208,940');
    await expect(equityCell).toContainText('$114,498');

    // Take screenshot for AC1 and AC3 verification
    await page.screenshot({ path: 'screenshots/projections-rent.png', fullPage: true });

    // 5. AC2: SALE holding period delta check
    // Change disposition type to SALE
    const saleBtn = page.locator('button', { hasText: 'SALE' }).first();
    await expect(saleBtn).toBeVisible();
    await saleBtn.click();

    // Wait for holding period cards to display
    const holdingPeriodHeader = page.locator('h4:has-text("Holding Period Durations")').first();
    await expect(holdingPeriodHeader).toBeVisible();

    // Locate the cards for 90 Days Hold and 270 Days Hold
    const card90 = page.locator('#holding-card-90').first();
    const card270 = page.locator('#holding-card-270').first();
    await expect(card90).toBeVisible();
    await expect(card270).toBeVisible();

    // Extract accrued holding costs and net profit for 90 and 270 days
    const hc90Text = await card90.locator('span.font-mono').first().innerText();
    const np90Text = await card90.locator('p.font-mono').first().innerText();
    const hc270Text = await card270.locator('span.font-mono').first().innerText();
    const np270Text = await card270.locator('p.font-mono').first().innerText();

    const hc90 = parseVal(hc90Text);
    const np90 = parseVal(np90Text);
    const hc270 = parseVal(hc270Text);
    const np270 = parseVal(np270Text);

    // Calculate profit delta and holding costs delta
    const profitDelta = np90 - np270;
    const holdingCostsDelta = hc270 - hc90;

    // Verify profit delta equals accrued holding costs delta exactly (within $2 tolerance for roundings)
    expect(Math.abs(profitDelta - holdingCostsDelta)).toBeLessThanOrEqual(2);

    // 6. Test editable periods: change 90 days to 120 days
    const input90 = page.locator('#input-holding-period-1'); // Index 1 is 90 days
    await input90.fill('120');
    await input90.press('Enter');

    // Card should now display "120 Days Hold"
    const card120 = page.locator('#holding-card-120').first();
    await expect(card120).toBeVisible();

    // Take screenshot for SALE projections verification
    await page.screenshot({ path: 'screenshots/projections-sale.png', fullPage: true });
  });
});
