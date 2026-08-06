/**
 * Top-3 line-item previews for the Tax Intelligence report cards.
 *
 * Requirement 2 asks each Monthly card to show a preview of its top three line
 * items. Rather than duplicate any arithmetic, these read the same generators
 * `ReportViewModal` uses, so a card preview can never disagree with the full
 * report it opens.
 *
 * Reports without a meaningful three-line summary return an empty array; the
 * card then falls back to its description.
 */

import {
  generateBalanceSheet,
  generateCashFlowStatement,
  generatePLStatement,
  generateRentRollReport,
  formatCurrency,
  type ReportOptions,
} from './reportEngine';

export interface PreviewLine {
  label: string;
  value: string;
}

/** Report ids that support a preview. Others render their description instead. */
export type PreviewableReportId =
  | 'PL'
  | 'BALANCE_SHEET'
  | 'CASH_FLOW'
  | 'RENT_ROLL';

const DEFAULT_OPTIONS: ReportOptions = {
  scope: 'portfolio',
  period: 'Monthly',
};

/**
 * Build up to three headline lines for a report card.
 *
 * Never throws: a generator failing on sparse data must not take down the
 * catalog, so the card degrades to no preview.
 */
export function getReportPreview(
  reportId: string,
  projects: unknown[],
  options: ReportOptions = DEFAULT_OPTIONS,
): PreviewLine[] {
  if (!projects || projects.length === 0) return [];

  try {
    switch (reportId) {
      case 'PL': {
        const d = generatePLStatement(projects as never[], options);
        return [
          { label: 'Gross rental income', value: formatCurrency(d.grossRentalIncome) },
          { label: 'Total operating expenses', value: formatCurrency(d.totalOperatingExpenses) },
          { label: 'Net operating income', value: formatCurrency(d.netOperatingIncome) },
        ];
      }
      case 'BALANCE_SHEET': {
        const d = generateBalanceSheet(projects as never[], options);
        return [
          { label: 'Total assets', value: formatCurrency(d.assets.totalAssets) },
          { label: 'Mortgage debt', value: formatCurrency(d.liabilities.mortgageDebt) },
          // Deposits are a liability and are never netted into equity.
          {
            label: 'Security deposits held',
            value: formatCurrency(d.liabilities.securityDepositLiabilities),
          },
        ];
      }
      case 'CASH_FLOW': {
        const d = generateCashFlowStatement(projects as never[], options);
        return [
          { label: 'Net operating income', value: formatCurrency(d.netOperatingIncome) },
          { label: 'Principal paydown', value: formatCurrency(d.debtService.principalPaydown) },
          { label: 'Distributable cash', value: formatCurrency(d.netDistributableCash) },
        ];
      }
      case 'RENT_ROLL': {
        const d = generateRentRollReport(projects as never[], options);
        return [
          { label: 'Occupied units', value: `${d.occupiedUnits} of ${d.totalUnits}` },
          { label: 'Monthly rent roll', value: formatCurrency(d.totalMonthlyRent) },
          {
            label: 'Delinquency',
            value: d.isPaymentTrackingConnected ? 'Tracking connected' : 'Not connected',
          },
        ];
      }
      default:
        return [];
    }
  } catch (err) {
    console.warn('[reportPreview] preview unavailable for', reportId, err);
    return [];
  }
}
