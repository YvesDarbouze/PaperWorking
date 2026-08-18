export type MetricPhase = 'ACQUISITION' | 'PURCHASE' | 'HOLD' | 'EXIT' | 'TAX';
export type ChartType = 'bar' | 'line' | 'pie' | 'gauge' | 'metric_card';

export interface MetricDefinition {
  id: string;
  name: string;
  phase: MetricPhase;
  formula: string;
  requiredInputs: string[];
  chartType: ChartType;
  unit: 'USD' | 'percentage' | 'days' | 'count' | 'ratio';
}

import {
  CANONICAL_EXPENSE_TAGS,
  REJECTED_EXPENSE_TAGS,
  isValidExpenseTag,
  validateExpenseTag,
  type CanonicalExpenseTag,
  type ExpenseTag,
} from './types';

export {
  CANONICAL_EXPENSE_TAGS,
  CANONICAL_EXPENSE_TAGS as CANONICAL_8_EXPENSE_TAGS,
  REJECTED_EXPENSE_TAGS,
  isValidExpenseTag,
  validateExpenseTag,
  type CanonicalExpenseTag,
  type ExpenseTag,
};

export const METRIC_REGISTRY_33: Record<string, MetricDefinition> = {
  // ACQUISITION (1-7)
  offers_sent_total: { id: 'offers_sent_total', name: 'Offers Sent', phase: 'ACQUISITION', formula: 'SUM(offers_sent)', requiredInputs: ['offers_sent'], chartType: 'bar', unit: 'count' },
  response_rate_pct: { id: 'response_rate_pct', name: 'Response Rate', phase: 'ACQUISITION', formula: '(responses / offers_sent) * 100', requiredInputs: ['responses', 'offers_sent'], chartType: 'gauge', unit: 'percentage' },
  avg_offer_amount: { id: 'avg_offer_amount', name: 'Avg Offer Amount', phase: 'ACQUISITION', formula: 'SUM(offer_amounts) / COUNT(offers)', requiredInputs: ['offer_amounts'], chartType: 'metric_card', unit: 'USD' },
  deals_under_contract: { id: 'deals_under_contract', name: 'Deals Under Contract', phase: 'ACQUISITION', formula: 'COUNT(deals_in_escrow)', requiredInputs: ['deals_in_escrow'], chartType: 'bar', unit: 'count' },
  acceptance_rate_pct: { id: 'acceptance_rate_pct', name: 'Acceptance Rate', phase: 'ACQUISITION', formula: '(accepted_offers / total_offers) * 100', requiredInputs: ['accepted_offers', 'total_offers'], chartType: 'gauge', unit: 'percentage' },
  crowdfunding_raised_total: { id: 'crowdfunding_raised_total', name: 'Crowdfunded Capital', phase: 'ACQUISITION', formula: 'SUM(lp_contributions)', requiredInputs: ['lp_contributions'], chartType: 'pie', unit: 'USD' },
  investor_count_total: { id: 'investor_count_total', name: 'Total Investors', phase: 'ACQUISITION', formula: 'COUNT(unique_investors)', requiredInputs: ['unique_investors'], chartType: 'metric_card', unit: 'count' },

  // PURCHASE (8-13)
  avg_closing_days: { id: 'avg_closing_days', name: 'Avg Closing Time', phase: 'PURCHASE', formula: 'AVG(closing_date - psa_date)', requiredInputs: ['closing_date', 'psa_date'], chartType: 'line', unit: 'days' },
  loan_approval_rate_pct: { id: 'loan_approval_rate_pct', name: 'Loan Approval Rate', phase: 'PURCHASE', formula: '(approved_loans / total_loan_apps) * 100', requiredInputs: ['approved_loans', 'total_loan_apps'], chartType: 'gauge', unit: 'percentage' },
  doc_completion_rate_pct: { id: 'doc_completion_rate_pct', name: 'Doc Completion Rate', phase: 'PURCHASE', formula: '(completed_docs / total_required_docs) * 100', requiredInputs: ['completed_docs', 'total_required_docs'], chartType: 'gauge', unit: 'percentage' },
  total_closing_costs: { id: 'total_closing_costs', name: 'Total Closing Costs', phase: 'PURCHASE', formula: 'SUM(title_escrow_settlement_fees)', requiredInputs: ['title_escrow_settlement_fees'], chartType: 'pie', unit: 'USD' },
  total_origination_fees: { id: 'total_origination_fees', name: 'Origination Fees', phase: 'PURCHASE', formula: 'SUM(lender_points_origination)', requiredInputs: ['lender_points_origination'], chartType: 'metric_card', unit: 'USD' },
  total_title_insurance: { id: 'total_title_insurance', name: 'Title Insurance', phase: 'PURCHASE', formula: 'SUM(title_policy_premiums)', requiredInputs: ['title_policy_premiums'], chartType: 'metric_card', unit: 'USD' },

  // HOLD (14-20)
  avg_daily_holding_cost: { id: 'avg_daily_holding_cost', name: 'Avg Daily Holding Cost', phase: 'HOLD', formula: '(mortgage + tax + insurance + utilities) / 30', requiredInputs: ['mortgage', 'tax', 'insurance', 'utilities'], chartType: 'line', unit: 'USD' },
  rehab_overrun_pct: { id: 'rehab_overrun_pct', name: 'Rehab Overrun', phase: 'HOLD', formula: '((actual_rehab - budget_rehab) / budget_rehab) * 100', requiredInputs: ['actual_rehab', 'budget_rehab'], chartType: 'gauge', unit: 'percentage' },
  rental_occupancy_rate_pct: { id: 'rental_occupancy_rate_pct', name: 'Rental Occupancy', phase: 'HOLD', formula: '(occupied_units / total_units) * 100', requiredInputs: ['occupied_units', 'total_units'], chartType: 'pie', unit: 'percentage' },
  cash_on_cash_return_pct: { id: 'cash_on_cash_return_pct', name: 'Cash-on-Cash Return', phase: 'HOLD', formula: '(annual_cash_flow / total_cash_invested) * 100', requiredInputs: ['annual_cash_flow', 'total_cash_invested'], chartType: 'gauge', unit: 'percentage' },
  cap_rate_pct: { id: 'cap_rate_pct', name: 'Cap Rate', phase: 'HOLD', formula: '(noi / purchase_price) * 100', requiredInputs: ['noi', 'purchase_price'], chartType: 'gauge', unit: 'percentage' },
  monthly_gross_rent_total: { id: 'monthly_gross_rent_total', name: 'Monthly Gross Rent', phase: 'HOLD', formula: 'SUM(gross_scheduled_rent / 12)', requiredInputs: ['gross_scheduled_rent'], chartType: 'line', unit: 'USD' },
  monthly_expenses_total: { id: 'monthly_expenses_total', name: 'Monthly Expenses', phase: 'HOLD', formula: 'SUM(opex / 12)', requiredInputs: ['opex'], chartType: 'bar', unit: 'USD' },

  // EXIT (21-27)
  avg_days_on_market: { id: 'avg_days_on_market', name: 'Avg Days on Market', phase: 'EXIT', formula: 'AVG(under_contract_date - listing_date)', requiredInputs: ['under_contract_date', 'listing_date'], chartType: 'line', unit: 'days' },
  sale_to_list_ratio_pct: { id: 'sale_to_list_ratio_pct', name: 'Sale-to-List Ratio', phase: 'EXIT', formula: '(sale_price / list_price) * 100', requiredInputs: ['sale_price', 'list_price'], chartType: 'gauge', unit: 'percentage' },
  avg_net_profit_per_deal: { id: 'avg_net_profit_per_deal', name: 'Avg Net Profit / Deal', phase: 'EXIT', formula: 'AVG(sale_price - adjusted_basis - selling_costs)', requiredInputs: ['sale_price', 'adjusted_basis', 'selling_costs'], chartType: 'bar', unit: 'USD' },
  annualized_roi_pct: { id: 'annualized_roi_pct', name: 'Annualized ROI', phase: 'EXIT', formula: '((total_returns / cash_invested) ^ (1 / years_held) - 1) * 100', requiredInputs: ['total_returns', 'cash_invested', 'years_held'], chartType: 'gauge', unit: 'percentage' },
  total_capital_gains: { id: 'total_capital_gains', name: 'Total Capital Gains', phase: 'EXIT', formula: 'SUM(sale_price - adjusted_basis)', requiredInputs: ['sale_price', 'adjusted_basis'], chartType: 'bar', unit: 'USD' },
  exchange_1031_rate_pct: { id: 'exchange_1031_rate_pct', name: '1031 Exchange Rate', phase: 'EXIT', formula: '(exchange_1031_deals / total_exit_deals) * 100', requiredInputs: ['exchange_1031_deals', 'total_exit_deals'], chartType: 'gauge', unit: 'percentage' },
  total_exit_revenue: { id: 'total_exit_revenue', name: 'Total Exit Revenue', phase: 'EXIT', formula: 'SUM(gross_sale_prices)', requiredInputs: ['gross_sale_prices'], chartType: 'bar', unit: 'USD' },

  // TAX (28-33)
  est_quarterly_tax_liability: { id: 'est_quarterly_tax_liability', name: 'Est. Quarterly Tax', phase: 'TAX', formula: 'taxable_income * marginal_tax_rate / 4', requiredInputs: ['taxable_income', 'marginal_tax_rate'], chartType: 'bar', unit: 'USD' },
  ytd_depreciation_total: { id: 'ytd_depreciation_total', name: 'YTD Depreciation', phase: 'TAX', formula: '(building_basis / 27.5)', requiredInputs: ['building_basis'], chartType: 'line', unit: 'USD' },
  total_1099s_issued: { id: 'total_1099s_issued', name: '1099s Required', phase: 'TAX', formula: 'COUNT(contractors > 600)', requiredInputs: ['contractors_payments'], chartType: 'metric_card', unit: 'count' },
  schedule_e_net_income_total: { id: 'schedule_e_net_income_total', name: 'Schedule E Income', phase: 'TAX', formula: 'rental_income - opex - depreciation', requiredInputs: ['rental_income', 'opex', 'depreciation'], chartType: 'line', unit: 'USD' },
  safe_harbor_met_pct: { id: 'safe_harbor_met_pct', name: 'Safe Harbor Met', phase: 'TAX', formula: 'min(100, (ytd_paid / prior_year_tax) * 100)', requiredInputs: ['ytd_paid', 'prior_year_tax'], chartType: 'gauge', unit: 'percentage' },
  total_tax_documents_generated: { id: 'total_tax_documents_generated', name: 'Tax Docs Generated', phase: 'TAX', formula: 'COUNT(vault_tax_documents)', requiredInputs: ['vault_tax_documents'], chartType: 'metric_card', unit: 'count' },
};
