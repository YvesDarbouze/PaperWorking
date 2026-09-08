import { describe, expect, it } from '@jest/globals';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal.js';
import {
  aggregateStatementMatrices,
  deriveProjectStatementMatrix,
  type ProjectStatementInputs,
} from '../statement-engine.js';

describe('Audit Suite: Financial Statement Engine & Canonical P&L Hand-Math', () => {
  /**
   * CANONICAL SEED DEAL P&L VERIFICATION:
   * Gross Scheduled Rent = $24,000 ($2,000/mo)
   * Vacancy Rate = 3% -> Vacancy Loss = $24,000 * 0.03 = $720 ($60/mo)
   * Other Income = $0
   * Gross Operating Income (GOI) = $24,000 - $720 = $23,280 ($1,940/mo)
   *
   * Itemized OpEx:
   *   Tax = $3,600
   *   Insurance = $1,800
   *   Maintenance = $1,995
   *   Management = $2,400
   *   Utilities = $1,000
   *   Security/HOA/Other = $0
   *   Total Operating Expenses = $10,795
   *
   * Net Operating Income (NOI):
   *   NOI = GOI - Total OpEx = $23,280 - $10,795 = $12,485 ($1,040.42/mo)
   *
   * Debt Service (Loan $223,200, 6.5%, 30-year):
   *   Monthly payment = $1,410.78
   *   Total Annual Debt Service = $1,410.78 * 12 = $16,929.36
   *
   * Cash Flow Before Tax (CFBT):
   *   CFBT = NOI - Total Debt Service = $12,485 - $16,929.36 = -$4,444.36
   */
  const canonicalInputs: ProjectStatementInputs = {
    projectId: 'seed-project-1',
    projectName: 'Canonical Seed Deal',
    purchasePrice: canonicalSeedDeal.purchase_price,
    propertyValue: canonicalSeedDeal.property_value,
    grossScheduledRentAnnual: canonicalSeedDeal.gross_scheduled_rent,
    vacancyRatePct: canonicalSeedDeal.vacancy_rate,
    otherIncomeAnnual: canonicalSeedDeal.other_income,
    expenses: {
      tax: canonicalSeedDeal.expenses.tax,
      insurance: canonicalSeedDeal.expenses.insurance,
      maintenance: canonicalSeedDeal.expenses.maintenance,
      management: canonicalSeedDeal.expenses.management,
      utilities: canonicalSeedDeal.expenses.utilities,
      security: canonicalSeedDeal.expenses.security,
      HOA: canonicalSeedDeal.expenses.HOA,
      capex: canonicalSeedDeal.expenses.capex,
    },
    debt: {
      loanAmount: canonicalSeedDeal.loan_amount,
      interestRate: canonicalSeedDeal.interest_rate,
      termYears: canonicalSeedDeal.loan_term_years,
    },
    depreciation: {
      landValue: 55800, // 20% of $279,000
      improvementBasis: 223200, // 80% of $279,000
      inServiceDate: '2024-01-01',
      assetClass: 'residential_27_5',
    },
  };

  it('matches exact canonical hand-math on annual P&L statement totals', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'PL',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    expect(matrix.totalsSummary.grossRevenue).toBe(23280);
    expect(matrix.totalsSummary.totalOpEx).toBe(10795);
    expect(matrix.totalsSummary.noi).toBe(12485);
    expect(matrix.totalsSummary.debtService).toBe(16929.36);
    expect(matrix.totalsSummary.cashFlowBeforeTax).toBe(-4444.36);

    // Verify Row IDs exist in order
    const rowIds = matrix.rows.map((r) => r.id);
    expect(rowIds).toContain('gsr');
    expect(rowIds).toContain('vacancy');
    expect(rowIds).toContain('goi');
    expect(rowIds).toContain('total_opex');
    expect(rowIds).toContain('noi');
    expect(rowIds).toContain('debt_interest');
    expect(rowIds).toContain('debt_principal');
    expect(rowIds).toContain('cfbt');
    expect(rowIds).toContain('depreciation_deduction');
    expect(rowIds).toContain('taxable_income');

    // Check specific rows
    const gsrRow = matrix.rows.find((r) => r.id === 'gsr')!;
    expect(gsrRow.total).toBe(24000);
    expect(gsrRow.values.m1).toBe(2000);

    const vacRow = matrix.rows.find((r) => r.id === 'vacancy')!;
    expect(vacRow.total).toBe(-720);
    expect(vacRow.values.m1).toBe(-60);

    const noiRow = matrix.rows.find((r) => r.id === 'noi')!;
    expect(noiRow.total).toBe(12485);
  });

  it('supports monthly granularity with 12 chronological period columns + Total', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'PL',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    expect(matrix.columns.length).toBe(13); // 12 months + 1 total
    expect(matrix.columns[0].key).toBe('m1');
    expect(matrix.columns[0].label).toBe('Jan');
    expect(matrix.columns[11].key).toBe('m12');
    expect(matrix.columns[11].label).toBe('Dec');
    expect(matrix.columns[12].key).toBe('total');
    expect(matrix.columns[12].isTotal).toBe(true);
  });

  it('supports quarterly granularity with 4 chronological period columns + Total', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'PL',
      granularity: 'quarterly',
      fiscalYear: 2026,
    });

    expect(matrix.columns.length).toBe(5); // 4 quarters + 1 total
    expect(matrix.columns[0].key).toBe('q1');
    expect(matrix.columns[0].label).toBe('Q1');
    expect(matrix.columns[3].key).toBe('q4');
    expect(matrix.columns[3].label).toBe('Q4');
    expect(matrix.columns[4].isTotal).toBe(true);

    const gsrRow = matrix.rows.find((r) => r.id === 'gsr')!;
    expect(gsrRow.values.q1).toBe(6000); // $2,000 * 3
    expect(gsrRow.total).toBe(24000);
  });

  it('supports annual multi-year hold period granularity', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'PL',
      granularity: 'annual',
      fiscalYear: 2026,
      holdYears: 5,
    });

    expect(matrix.columns.length).toBe(6); // 5 years + 1 total
    expect(matrix.columns[0].key).toBe('yr1');
    expect(matrix.columns[0].label).toBe('Year 1');
    expect(matrix.columns[4].key).toBe('yr5');
    expect(matrix.columns[4].label).toBe('Year 5');
    expect(matrix.columns[5].isTotal).toBe(true);

    const gsrRow = matrix.rows.find((r) => r.id === 'gsr')!;
    expect(gsrRow.values.yr1).toBe(24000);
    expect(gsrRow.total).toBe(120000); // $24,000 * 5
  });

  it('derives Balance Sheet with $0 security deposits when no input provided (no silent substitution)', () => {
    // canonicalInputs does NOT provide tenantSecurityDeposits
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'BALANCE_SHEET',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    const secDepRow = matrix.rows.find((r) => r.id === 'tenant_security_deposits')!;
    expect(secDepRow).toBeDefined();
    // Must be $0 — never the fabricated GSR/12 = $2,000
    expect(secDepRow.values.m1).toBe(0);
    expect(secDepRow.total).toBe(0);
    // Must include disclosure note
    expect(secDepRow.label).toContain('no security deposit input provided');

    const mortRow = matrix.rows.find((r) => r.id === 'mortgage_debt_balance')!;
    expect(mortRow).toBeDefined();
    expect(mortRow.values.m1).toBeLessThan(223200); // Amortizing balance
  });

  it('uses explicit tenantSecurityDeposits when provided on Balance Sheet', () => {
    const withDeposits: ProjectStatementInputs = {
      ...canonicalInputs,
      tenantSecurityDeposits: 4000, // Explicit: two months' rent
    };
    const matrix = deriveProjectStatementMatrix(withDeposits, {
      statementType: 'BALANCE_SHEET',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    const secDepRow = matrix.rows.find((r) => r.id === 'tenant_security_deposits')!;
    expect(secDepRow).toBeDefined();
    expect(secDepRow.values.m1).toBe(4000);
    expect(secDepRow.total).toBe(4000);
    // No disclosure note when input is provided
    expect(secDepRow.label).not.toContain('no security deposit input provided');
  });

  it('aggregates multiple projects into Portfolio Aggregate matrix accurately', () => {
    const projA = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'PL',
      granularity: 'quarterly',
      fiscalYear: 2026,
    });

    const projBInputs: ProjectStatementInputs = {
      ...canonicalInputs,
      projectId: 'proj-b',
      grossScheduledRentAnnual: 36000,
    };
    const projB = deriveProjectStatementMatrix(projBInputs, {
      statementType: 'PL',
      granularity: 'quarterly',
      fiscalYear: 2026,
    });

    const agg = aggregateStatementMatrices([projA, projB]);
    expect(agg).not.toBeNull();

    const gsrRow = agg!.rows.find((r) => r.id === 'gsr')!;
    expect(gsrRow.total).toBe(24000 + 36000); // $60,000
    expect(gsrRow.values.q1).toBe(6000 + 9000); // $15,000
  });

  it('enforces Balance Sheet identity: Equity = Assets − Liabilities for every period', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'BALANCE_SHEET',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    const assetRow = matrix.rows.find((r) => r.id === 'net_book_val')!;
    const liabRow = matrix.rows.find((r) => r.id === 'total_liabilities')!;
    const equityRow = matrix.rows.find((r) => r.id === 'net_owner_equity')!;

    expect(assetRow).toBeDefined();
    expect(liabRow).toBeDefined();
    expect(equityRow).toBeDefined();

    // Verify identity across all 12 monthly period columns (skip 'total' column — it uses row.total)
    const periodColumns = matrix.columns.filter((c) => !c.isTotal);
    for (const col of periodColumns) {
      const assets = assetRow.values[col.key] as number;
      const liabilities = liabRow.values[col.key] as number;
      const equity = equityRow.values[col.key] as number;

      expect(assets).toBeDefined();
      expect(liabilities).toBeDefined();
      expect(equity).toBeDefined();

      // Equity = Assets − Liabilities (within penny tolerance for floating point)
      expect(Math.abs(equity - (assets - liabilities))).toBeLessThan(0.02);
    }

    // Also verify total column via row.total
    expect(
      Math.abs((equityRow.total as number) - ((assetRow.total as number) - (liabRow.total as number))),
    ).toBeLessThan(0.02);
  });

  it('enforces Cash Flow identity: Net = Operating + Investing + Financing for every period', () => {
    const matrix = deriveProjectStatementMatrix(canonicalInputs, {
      statementType: 'CASH_FLOW',
      granularity: 'monthly',
      fiscalYear: 2026,
    });

    const noiRow = matrix.rows.find((r) => r.id === 'cf_noi')!;
    const debtServiceRow = matrix.rows.find((r) => r.id === 'cf_debt_service_total')!;
    const capexRow = matrix.rows.find((r) => r.id === 'cf_capex')!;
    const netRow = matrix.rows.find((r) => r.id === 'cf_net_distributable')!;

    expect(noiRow).toBeDefined();
    expect(debtServiceRow).toBeDefined();
    expect(capexRow).toBeDefined();
    expect(netRow).toBeDefined();

    // Verify identity across all 12 monthly period columns (skip 'total' column — it uses row.total)
    const periodColumns = matrix.columns.filter((c) => !c.isTotal);
    for (const col of periodColumns) {
      const operating = noiRow.values[col.key] as number;
      const financing = debtServiceRow.values[col.key] as number;
      const investing = capexRow.values[col.key] as number;
      const net = netRow.values[col.key] as number;

      expect(operating).toBeDefined();
      expect(financing).toBeDefined();
      expect(investing).toBeDefined();
      expect(net).toBeDefined();

      // Net = Operating + Financing + Investing (within penny tolerance)
      expect(Math.abs(net - (operating + financing + investing))).toBeLessThan(0.02);
    }

    // Also verify total column
    const totalNet = netRow.total as number;
    const totalOps = noiRow.total as number;
    const totalFin = debtServiceRow.total as number;
    const totalInv = capexRow.total as number;
    expect(Math.abs(totalNet - (totalOps + totalFin + totalInv))).toBeLessThan(0.02);
  });
});
