import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth.js';

interface KpiSpecDefinition {
  number: number;
  id: string;
  name: string;
  phase: number;
  phaseTitle: string;
}

const AUTHORITATIVE_33_KPIS: KpiSpecDefinition[] = [
  // Phase 1: Deal Intake & Quick Screen (8)
  { number: 1, id: 'gross_purchase_price', name: 'Gross Purchase Price', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 2, id: 'rehab_budget', name: 'Rehab Budget', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 3, id: 'total_cost_basis', name: 'Total Cost Basis', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 4, id: 'estimated_arv', name: 'After Repair Value (ARV)', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 5, id: 'initial_loan_amount', name: 'Initial Loan Amount', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 6, id: 'target_cash_required', name: 'Target Cash Required', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 7, id: 'quick_cap_rate', name: 'Quick Cap Rate', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },
  { number: 8, id: 'projected_gross_rent', name: 'Projected Gross Rent', phase: 1, phaseTitle: 'Phase 1: Deal Intake & Quick Screen' },

  // Phase 2: Full Underwriting & Return Modeling (10)
  { number: 9, id: 'unlevered_irr', name: 'Unlevered IRR', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 10, id: 'levered_irr', name: 'Levered IRR', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 11, id: 'equity_multiple', name: 'Equity Multiple (MOIC)', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 12, id: 'net_present_value', name: 'Net Present Value (NPV)', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 13, id: 'cash_on_cash', name: 'Cash-on-Cash Return (Y1)', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 14, id: 'average_annual_cash_yield', name: 'Average Annual Cash Yield (AAR)', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 15, id: 'dscr', name: 'Debt Service Coverage (DSCR)', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 16, id: 'debt_yield', name: 'Debt Yield', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 17, id: 'break_even_occupancy', name: 'Break-Even Occupancy', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },
  { number: 18, id: 'profit_margin_on_cost', name: 'Profit Margin on Cost', phase: 2, phaseTitle: 'Phase 2: Full Underwriting & Return Modeling' },

  // Phase 3: Debt Sizing & Capital Stack (8)
  { number: 19, id: 'ltv', name: 'Loan-to-Value (LTV)', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 20, id: 'ltc', name: 'Loan-to-Cost (LTC)', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 21, id: 'max_supportable_loan', name: 'Maximum Supportable Loan', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 22, id: 'monthly_debt_service', name: 'Monthly Debt Service', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 23, id: 'interest_rate_type_spread', name: 'Interest Rate Type & Spread', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 24, id: 'amortization_balloon_term', name: 'Amortization & Balloon Term', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 25, id: 'equity_required_gp_lp', name: 'Equity Required (GP vs LP)', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },
  { number: 26, id: 'preferred_return_hurdle', name: 'Preferred Return Hurdle', phase: 3, phaseTitle: 'Phase 3: Debt Sizing & Capital Stack' },

  // Phase 4: Sensitivity & Exit Analysis (7)
  { number: 27, id: 'exit_sale_price', name: 'Exit Sale Price', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 28, id: 'exit_cap_sensitivity', name: 'Exit Cap Rate Sensitivity', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 29, id: 'hold_period_sensitivity', name: 'Hold Period Sensitivity', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 30, id: 'rent_growth_stress_test', name: 'Rent Growth Stress Test', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 31, id: 'vacancy_rate_stress_test', name: 'Vacancy Rate Stress Test', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 32, id: 'net_sales_proceeds', name: 'Net Sales Proceeds', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
  { number: 33, id: 'investor_profit_at_exit', name: 'Investor Profit at Exit', phase: 4, phaseTitle: 'Phase 4: Sensitivity & Exit Analysis' },
];

test.describe('Authoritative 33 Underwriting KPI Sweep (E2E Verification Units)', () => {
  test.beforeEach(async ({ context }) => {
    await createDevSessionForContext(context, 'investor');
  });

  const phases = [1, 2, 3, 4] as const;

  for (const phaseNum of phases) {
    const phaseKpis = AUTHORITATIVE_33_KPIS.filter((k) => k.phase === phaseNum);
    const phaseTitle = phaseKpis[0]?.phaseTitle || `Phase ${phaseNum}`;

    test.describe(phaseTitle, () => {
      for (const kpi of phaseKpis) {
        test(`KPI #${kpi.number}: ${kpi.name} — Modal, Live Values, Visualization & CSV Export`, async ({ page }) => {
          await page.goto('/dashboard/insights');
          await page.waitForLoadState('networkidle');

          const card = page.locator(`[data-kpi-number="${kpi.number}"]`);
          await card.scrollIntoViewIfNeeded();
          await expect(card).toBeVisible();

          // Open modal
          await card.click();
          const modal = page.getByRole('dialog');
          await expect(modal).toBeVisible();

          // Header assertions
          await expect(modal.getByTestId('kpi-modal-title')).toHaveText(kpi.name);
          const valEl = modal.getByTestId('modal-kpi-value');
          await expect(valEl).toBeVisible();
          const valText = await valEl.innerText();
          expect(valText.trim()).not.toBe('');
          expect(valText).not.toContain('NaN');

          // Definition & Live substituted formula
          await expect(modal.getByTestId('modal-definition')).toBeVisible();
          await expect(modal.getByTestId('modal-formula-substituted')).toBeVisible();

          // In-modal CSV Export
          const exportBtn = modal.getByTestId('modal-export-csv-btn');
          await expect(exportBtn).toBeVisible();

          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          await exportBtn.click();
          const download = await downloadPromise;

          const filename = download.suggestedFilename();
          expect(filename).toMatch(/\.csv$/i);
          expect(filename).toContain('paperworking');

          // Close modal
          await modal.getByTestId('modal-close-btn').click();
          await expect(modal).not.toBeVisible();
        });
      }
    });
  }
});
