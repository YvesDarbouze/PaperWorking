import { generateBalanceSheet, type ReportOptions } from '@/lib/reports/reportEngine';

/**
 * Regression: a project carrying `loanAmount` but no `purchasePrice` produced
 * a NEGATIVE implied down payment, a negative cash reserve, and therefore a
 * negative Total Assets on the balance sheet. Surfaced by the Tax Intelligence
 * card preview, which rendered "Total assets −$162,000.00".
 *
 * Assets are never negative in this model; missing price data means the record
 * is incomplete, not that the owner holds negative cash.
 */

const OPTIONS: ReportOptions = { scope: 'portfolio', period: 'Monthly' };

describe('generateBalanceSheet — asset floor', () => {
  it('does not go negative when loanAmount is set but purchasePrice is missing', () => {
    const projects = [{ id: 'p1', financials: { loanAmount: 1_080_000 } }];

    const bs = generateBalanceSheet(projects, OPTIONS);

    expect(bs.assets.cashAndEquivalents).toBeGreaterThanOrEqual(0);
    expect(bs.assets.totalAssets).toBeGreaterThanOrEqual(0);
  });

  it('still computes a positive reserve from a real down payment', () => {
    const projects = [
      { id: 'p1', financials: { purchasePrice: 400_000, loanAmount: 300_000 } },
    ];

    const bs = generateBalanceSheet(projects, OPTIONS);

    // 100k down * 15% reserve heuristic
    expect(bs.assets.cashAndEquivalents).toBeCloseTo(15_000, 2);
    expect(bs.assets.totalAssets).toBeGreaterThan(0);
  });

  it('keeps security deposits as a distinct liability, never netted', () => {
    const projects = [
      {
        id: 'p1',
        financials: { purchasePrice: 400_000, loanAmount: 300_000, monthlyGrossRent: 2_500 },
      },
    ];

    const bs = generateBalanceSheet(projects, OPTIONS);

    expect(bs.liabilities.securityDepositLiabilities).toBe(2_500);
    expect(bs.liabilities.totalLiabilities).toBe(
      bs.liabilities.mortgageDebt + bs.liabilities.securityDepositLiabilities,
    );
  });

  it('balances: liabilities + equity equals total assets', () => {
    const projects = [
      { id: 'p1', financials: { purchasePrice: 400_000, loanAmount: 300_000, monthlyGrossRent: 2_500 } },
      { id: 'p2', financials: { loanAmount: 250_000 } },
    ];

    const bs = generateBalanceSheet(projects, OPTIONS);

    expect(bs.equity.totalLiabilitiesAndEquity).toBeCloseTo(bs.assets.totalAssets, 2);
  });

  it('returns zeroed figures for an empty portfolio rather than NaN', () => {
    const bs = generateBalanceSheet([], OPTIONS);
    expect(bs.assets.totalAssets).toBe(0);
    expect(Number.isNaN(bs.equity.ownersEquity)).toBe(false);
  });
});
