import { METRIC_TAXONOMY, MetricCategory } from '@/lib/metrics/metricTaxonomy';
import { MetricId } from '@/lib/metrics/types';

export interface KPILineageEntry {
  kpiId: MetricId;
  kpiNumber?: number;
  label: string;
  category: MetricCategory;
  sourceTables: string[];
  formula: string;
  drilldownRoute: string; // Dynamic or static route e.g. '/dashboard/projects/[id]/phase-1'
  description: string;
  lastComputedAt?: string; // ISO date timestamp
}

/**
 * Lineage Registry for all 33 canonical KPIs + APPRECIATION.
 * Maps each KPI to its underlying database source tables, mathematical formula,
 * and drilldown route for data provenance.
 */
export const KPI_LINEAGE_MAP: Record<string, KPILineageEntry> = {
  // 1. NOI
  NOI: {
    kpiId: 'NOI',
    kpiNumber: 1,
    label: 'Net Operating Income (NOI)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'NOI = Gross Operating Income − Operating Expenses',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Computed from total monthly gross rental income minus operating expenses (taxes, insurance, maintenance).',
  },
  // 2. CAP_RATE
  CAP_RATE: {
    kpiId: 'CAP_RATE',
    kpiNumber: 2,
    label: 'Capitalization Rate',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'valuations'],
    formula: 'Cap Rate = Annual NOI ÷ Property Value',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Unlevered yield comparing Net Operating Income against total property purchase price or market value.',
  },
  // 3. COC
  COC: {
    kpiId: 'COC',
    kpiNumber: 3,
    label: 'Cash-on-Cash Return',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'CoC = Annual Pre-Tax Cash Flow ÷ Total Cash Invested',
    drilldownRoute: '/dashboard/projects/[id]/phase-2',
    description: 'Annual net cash flow after debt service divided by actual cash deployed out of pocket.',
  },
  // 4. IRR
  IRR: {
    kpiId: 'IRR',
    kpiNumber: 4,
    label: 'Internal Rate of Return (IRR)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items', 'phase_gate_events'],
    formula: 'Solve NPV = 0 for time-weighted cash inflows & outflows',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Annualized rate of return taking into account exact timing of capital calls, distribution cash flows, and terminal exit proceeds.',
  },
  // 5. CASH_FLOW
  CASH_FLOW: {
    kpiId: 'CASH_FLOW',
    kpiNumber: 5,
    label: 'Cash Flow',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'Cash Flow = NOI − Debt Service',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Net liquid monthly or annual cash remaining after operational expenses and principal/interest debt payments.',
  },
  // 6. GRM
  GRM: {
    kpiId: 'GRM',
    kpiNumber: 6,
    label: 'Gross Rent Multiplier',
    category: 'Financial Performance',
    sourceTables: ['projects.financials'],
    formula: 'GRM = Purchase Price ÷ Annual Gross Scheduled Rent',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Years required for gross rental income to equal the initial acquisition cost.',
  },
  // 7. DSCR
  DSCR: {
    kpiId: 'DSCR',
    kpiNumber: 7,
    label: 'Debt Service Coverage Ratio',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'loans'],
    formula: 'DSCR = Net Operating Income ÷ Annual Debt Service',
    drilldownRoute: '/dashboard/projects/[id]/phase-2',
    description: 'Underwriting metric measuring property cash flow availability to cover annual mortgage obligations.',
  },
  // 8. LTV
  LTV: {
    kpiId: 'LTV',
    kpiNumber: 8,
    label: 'Loan-to-Value (LTV)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'loans'],
    formula: 'LTV = Total Debt Amount ÷ Current Property Value',
    drilldownRoute: '/dashboard/projects/[id]/phase-2',
    description: 'Proportion of total property capitalization represented by senior and debt financing.',
  },
  // 9. OER
  OER: {
    kpiId: 'OER',
    kpiNumber: 9,
    label: 'Operating Expense Ratio (OER)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'OER = (Operating Expenses ÷ Gross Operating Income) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Efficiency ratio indicating what percentage of gross revenue is consumed by operations.',
  },
  // 10. EQUITY_TO_VALUE
  EQUITY_TO_VALUE: {
    kpiId: 'EQUITY_TO_VALUE',
    kpiNumber: 10,
    label: 'Equity-to-Value Ratio',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'loans', 'valuations'],
    formula: 'Equity % = (Property Value − Total Debt) ÷ Property Value',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Percentage of market value owned clear of debt obligations.',
  },
  // 11. INTEREST_COVERAGE
  INTEREST_COVERAGE: {
    kpiId: 'INTEREST_COVERAGE',
    kpiNumber: 11,
    label: 'Interest Coverage Ratio',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'loans'],
    formula: 'Interest Coverage = NOI ÷ Annual Interest Expense',
    drilldownRoute: '/dashboard/projects/[id]/phase-2',
    description: 'Buffer multiple evaluating property income relative to pure interest expense.',
  },
  // 12. ROI
  ROI: {
    kpiId: 'ROI',
    kpiNumber: 12,
    label: 'Return on Investment (ROI)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'ROI = (Total Net Profit ÷ Total Invested Capital) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Cumulative unlevered or levered net profit relative to initial equity basis.',
  },
  // 13. CAPEX
  CAPEX: {
    kpiId: 'CAPEX',
    kpiNumber: 13,
    label: 'Capital Expenditures (CapEx)',
    category: 'Financial Performance',
    sourceTables: ['ledger_items', 'rehab_budgets'],
    formula: 'CapEx = Sum of Capital Improvement Expenses',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Capitalized physical improvements, roof/HVAC replacements, and major unit rehabs.',
  },
  // 14. GOI
  GOI: {
    kpiId: 'GOI',
    kpiNumber: 14,
    label: 'Gross Operating Income (GOI)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'rent_rolls'],
    formula: 'GOI = Gross Scheduled Rent + Other Income − Vacancy Loss',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Total actual collected revenue before operating expenditures.',
  },
  // 15. AAR
  AAR: {
    kpiId: 'AAR',
    kpiNumber: 15,
    label: 'Annual Average Return (AAR)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'AAR = (Cumulative Net Returns ÷ Holding Period Years)',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Straight-line average annual return across the holding duration.',
  },
  // 16. EQUITY_MULTIPLE
  EQUITY_MULTIPLE: {
    kpiId: 'EQUITY_MULTIPLE',
    kpiNumber: 16,
    label: 'Equity Multiple (EM)',
    category: 'Financial Performance',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'Equity Multiple = Total Cash Returned ÷ Total Cash Deployed',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Ratio of total cash distributions plus terminal proceeds over total invested capital.',
  },
  // 17. REVENUE_GROWTH
  REVENUE_GROWTH: {
    kpiId: 'REVENUE_GROWTH',
    kpiNumber: 17,
    label: 'Revenue Growth',
    category: 'Financial Performance',
    sourceTables: ['ledger_items', 'rent_rolls'],
    formula: 'Growth = ((Current Revenue − Prior Revenue) ÷ Prior Revenue) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Year-over-year or month-over-month growth rate in total property revenue.',
  },
  // 18. OCCUPANCY
  OCCUPANCY: {
    kpiId: 'OCCUPANCY',
    kpiNumber: 18,
    label: 'Occupancy Rate',
    category: 'Operational Efficiency',
    sourceTables: ['projects', 'rent_rolls', 'units'],
    formula: 'Occupancy Rate = (Occupied Units ÷ Total Units) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Percentage of leasable units with active executed leases and paying tenants.',
  },
  // 19. TENANT_TURNOVER
  TENANT_TURNOVER: {
    kpiId: 'TENANT_TURNOVER',
    kpiNumber: 19,
    label: 'Tenant Turnover Rate',
    category: 'Operational Efficiency',
    sourceTables: ['rent_rolls', 'tenants'],
    formula: 'Turnover = (Move-Outs ÷ Total Units) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Annualized rate at which tenants vacate and require unit turn/re-leasing.',
  },
  // 20. AVG_RENT_PER_PROPERTY
  AVG_RENT_PER_PROPERTY: {
    kpiId: 'AVG_RENT_PER_PROPERTY',
    kpiNumber: 20,
    label: 'Average Rent per Property',
    category: 'Operational Efficiency',
    sourceTables: ['projects.financials', 'rent_rolls'],
    formula: 'Avg Rent = Total Portfolio Rent ÷ Total Leased Properties',
    drilldownRoute: '/dashboard/projects',
    description: 'Mean monthly rental rate across portfolio holdings.',
  },
  // 21. LEASE_RENEWAL
  LEASE_RENEWAL: {
    kpiId: 'LEASE_RENEWAL',
    kpiNumber: 21,
    label: 'Lease Renewal Rate',
    category: 'Operational Efficiency',
    sourceTables: ['rent_rolls', 'tenants'],
    formula: 'Renewal Rate = (Renewed Leases ÷ Expiring Leases) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Percentage of expiring leases successfully renewed without vacancy turn.',
  },
  // 22. MAINTENANCE_COST_PER_UNIT
  MAINTENANCE_COST_PER_UNIT: {
    kpiId: 'MAINTENANCE_COST_PER_UNIT',
    kpiNumber: 22,
    label: 'Maintenance Cost per Unit',
    category: 'Operational Efficiency',
    sourceTables: ['ledger_items'],
    formula: 'Maint/Unit = Total Maintenance Expenses ÷ Unit Count',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Average annual repair and turnover expense allocated per individual unit.',
  },
  // 23. DOM
  DOM: {
    kpiId: 'DOM',
    kpiNumber: 23,
    label: 'Days on Market (DOM)',
    category: 'Operational Efficiency',
    sourceTables: ['projects', 'listings'],
    formula: 'DOM = Date Under Contract − Original Listing Date',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Total calendar days between listing property for sale/lease and contract execution.',
  },
  // 24. CONSTRUCTION_COST_SQFT
  CONSTRUCTION_COST_SQFT: {
    kpiId: 'CONSTRUCTION_COST_SQFT',
    kpiNumber: 24,
    label: 'Construction Cost per Sq Ft',
    category: 'Operational Efficiency',
    sourceTables: ['projects.financials', 'rehab_budgets'],
    formula: 'Cost/sqft = Total Renovation Budget ÷ Total Square Feet',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Hard and soft rehab costs normalized by total gross building area.',
  },
  // 25. PORTFOLIO_VALUE_GROWTH
  PORTFOLIO_VALUE_GROWTH: {
    kpiId: 'PORTFOLIO_VALUE_GROWTH',
    kpiNumber: 25,
    label: 'Portfolio Value Growth',
    category: 'Asset & Portfolio Management',
    sourceTables: ['valuations', 'projects.financials'],
    formula: 'Value Growth = ((Current Value − Initial Value) ÷ Initial Value) × 100',
    drilldownRoute: '/dashboard/insights',
    description: 'Cumulative appreciation and value-add equity growth across portfolio properties.',
  },
  // 26. PAYBACK_PERIOD
  PAYBACK_PERIOD: {
    kpiId: 'PAYBACK_PERIOD',
    kpiNumber: 26,
    label: 'Payback Period',
    category: 'Asset & Portfolio Management',
    sourceTables: ['projects.financials', 'ledger_items'],
    formula: 'Payback Years = Initial Equity Deployed ÷ Annual Net Cash Flow',
    drilldownRoute: '/dashboard/projects/[id]/phase-3',
    description: 'Time in years required for cumulative net cash flows to fully return initial capital.',
  },
  // 27. YOY_SOLD_PRICE_VARIANCE
  YOY_SOLD_PRICE_VARIANCE: {
    kpiId: 'YOY_SOLD_PRICE_VARIANCE',
    kpiNumber: 27,
    label: 'YoY Sold Price Variance',
    category: 'Asset & Portfolio Management',
    sourceTables: ['market_data', 'comps'],
    formula: 'YoY Variance = ((Current Avg Sold Price − Prior Avg) ÷ Prior Avg) × 100',
    drilldownRoute: '/dashboard/insights',
    description: 'Sub-market price trend variation comparing current sales against prior 12-month benchmarks.',
  },
  // 28. SOLD_PER_INVENTORY
  SOLD_PER_INVENTORY: {
    kpiId: 'SOLD_PER_INVENTORY',
    kpiNumber: 28,
    label: 'Sold per Inventory Ratio',
    category: 'Asset & Portfolio Management',
    sourceTables: ['market_data'],
    formula: 'Absorption Rate = Total Sales Volume ÷ Active Market Listings',
    drilldownRoute: '/dashboard/insights',
    description: 'Market absorption rate measuring buying demand speed against active sub-market supply.',
  },
  // 29. DEMAND_GROWTH
  DEMAND_GROWTH: {
    kpiId: 'DEMAND_GROWTH',
    kpiNumber: 29,
    label: 'Real Estate Demand Growth',
    category: 'Asset & Portfolio Management',
    sourceTables: ['market_data'],
    formula: 'Demand Growth = YoY Change in Active Buyer Inquiries & Contract Velocity',
    drilldownRoute: '/dashboard/insights',
    description: 'Macro sub-market buyer velocity indicator.',
  },
  // 30. LISTING_TO_MEETING
  LISTING_TO_MEETING: {
    kpiId: 'LISTING_TO_MEETING',
    kpiNumber: 30,
    label: 'Listing-to-Meeting Ratio',
    category: 'Marketing & Sales',
    sourceTables: ['listings', 'crm_activities'],
    formula: 'Conversion = (Showing Meetings ÷ Listing Views) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Funnel conversion efficiency from buyer traffic to buyer/agent showings.',
  },
  // 31. AVG_COMMISSION
  AVG_COMMISSION: {
    kpiId: 'AVG_COMMISSION',
    kpiNumber: 31,
    label: 'Average Commission per Sale',
    category: 'Marketing & Sales',
    sourceTables: ['projects.financials', 'dispositions'],
    formula: 'Avg Commission = Total Brokerage Fees ÷ Total Sales Completed',
    drilldownRoute: '/dashboard/projects/[id]/phase-4',
    description: 'Brokerage fees paid at disposition.',
  },
  // 32. RISK_SCORE
  RISK_SCORE: {
    kpiId: 'RISK_SCORE',
    kpiNumber: 32,
    label: 'Risk Assessment Score',
    category: 'Risk Management & Compliance',
    sourceTables: ['projects.financials', 'phase_gate_events'],
    formula: 'Risk Score = Composite Index of DSCR, LTV, Vacancy, and Due Diligence Flags',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Composite risk rating calculated from financial leverage, market volatility, and due diligence completion.',
  },
  // 33. COMPLIANCE_RATE
  COMPLIANCE_RATE: {
    kpiId: 'COMPLIANCE_RATE',
    kpiNumber: 33,
    label: 'Compliance Rate',
    category: 'Risk Management & Compliance',
    sourceTables: ['due_diligence_items', 'phase_gate_events'],
    formula: 'Compliance Rate = (Completed Checklist Items ÷ Total Required Items) × 100',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Percentage of required due diligence and legal checklist items fully verified.',
  },
  // APPRECIATION (Hero #10)
  APPRECIATION: {
    kpiId: 'APPRECIATION',
    label: 'Long-Term Appreciation',
    category: 'Financial Performance',
    sourceTables: ['valuations', 'market_data'],
    formula: 'Appreciation = CAGR of Property Market Value',
    drilldownRoute: '/dashboard/projects/[id]/phase-1',
    description: 'Compound annual growth rate of asset market valuation over time.',
  },
};

const KEY_MAP: Record<string, string> = {
  noi: 'NOI',
  cap_rate: 'CAP_RATE',
  cash_on_cash: 'COC',
  irr: 'IRR',
  cash_flow: 'CASH_FLOW',
  grm: 'GRM',
  dscr: 'DSCR',
  ltv: 'LTV',
  oer: 'OER',
  equity_to_value: 'EQUITY_TO_VALUE',
  interest_coverage: 'INTEREST_COVERAGE',
  roi: 'ROI',
  capex: 'CAPEX',
  goi: 'GOI',
  aar: 'AAR',
  equity_multiple: 'EQUITY_MULTIPLE',
  revenue_growth: 'REVENUE_GROWTH',
  occupancy_rate: 'OCCUPANCY',
  tenant_turnover: 'TENANT_TURNOVER',
  avg_rent_price: 'AVG_RENT_PER_PROPERTY',
  lease_renewal: 'LEASE_RENEWAL',
  maintenance_per_unit: 'MAINTENANCE_COST_PER_UNIT',
  days_on_market: 'DOM',
  construction_per_sqft: 'CONSTRUCTION_COST_SQFT',
  portfolio_value_growth: 'PORTFOLIO_VALUE_GROWTH',
  payback_period: 'PAYBACK_PERIOD',
  yoy_variance: 'YOY_SOLD_PRICE_VARIANCE',
  sold_per_inventory: 'SOLD_PER_INVENTORY',
  demand_growth: 'DEMAND_GROWTH',
  listing_to_meeting: 'LISTING_TO_MEETING',
  avg_commission: 'AVG_COMMISSION',
  risk_score: 'RISK_SCORE',
  compliance_rate: 'COMPLIANCE_RATE',
};

/**
 * Returns lineage metadata for any KPI by MetricId or metric key.
 * Supports canonical uppercase IDs ('NOI'), registry lowercase IDs ('noi', 'cash_on_cash'), or unmapped fallbacks.
 */
export function getKPILineage(kpiId: string): KPILineageEntry {
  if (!kpiId) {
    return {
      kpiId: 'NOI' as MetricId,
      label: 'Net Operating Income',
      category: 'Financial Performance',
      sourceTables: ['projects.financials'],
      formula: 'NOI = Gross Operating Income − Operating Expenses',
      drilldownRoute: '/dashboard/insights',
      description: 'Computed from total monthly gross rental income minus operating expenses.',
    };
  }

  // 1. Direct lookup
  if (KPI_LINEAGE_MAP[kpiId]) return KPI_LINEAGE_MAP[kpiId];

  // 2. Case variations
  const lower = kpiId.toLowerCase();
  const upper = kpiId.toUpperCase();
  if (KPI_LINEAGE_MAP[upper]) return KPI_LINEAGE_MAP[upper];
  if (KPI_LINEAGE_MAP[lower]) return KPI_LINEAGE_MAP[lower];

  // 3. KEY_MAP lookup
  const mappedKey = KEY_MAP[lower] || KEY_MAP[upper];
  if (mappedKey && KPI_LINEAGE_MAP[mappedKey]) return KPI_LINEAGE_MAP[mappedKey];

  // 4. Value scan (kpiId or label case-insensitive)
  const matchedEntry = Object.values(KPI_LINEAGE_MAP).find(
    (entry) =>
      entry.kpiId.toLowerCase() === lower ||
      entry.label.toLowerCase() === lower ||
      entry.kpiId.toUpperCase() === upper
  );
  if (matchedEntry) return matchedEntry;

  // 5. Fallback for custom or unmapped metric IDs
  const taxonomyEntry = METRIC_TAXONOMY.find((m) => m.id === kpiId || m.id.toLowerCase() === lower);
  return {
    kpiId: kpiId as MetricId,
    label: taxonomyEntry?.name || kpiId,
    category: taxonomyEntry?.category || 'Financial Performance',
    sourceTables: ['projects.financials'],
    formula: taxonomyEntry?.formula || 'Calculated Metric',
    drilldownRoute: '/dashboard/insights',
    description: taxonomyEntry?.description || 'Metric lineage metadata',
  };
}


