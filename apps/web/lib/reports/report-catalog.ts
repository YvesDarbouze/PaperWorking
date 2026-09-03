export type ReportCategory = 'Monthly' | 'Quarterly' | 'Annual' | 'Lender (SREO)';

export interface ReportCatalogItem {
  id:
    | 'PL'
    | 'BALANCE_SHEET'
    | 'CASH_FLOW'
    | 'RENT_ROLL'
    | 'SREO'
    | 'TAX_1040ES'
    | 'BUDGET_VS_ACTUALS'
    | 'SCHEDULE_E'
    | 'DEPRECIATION_SCHEDULE'
    | 'FORM_1099_SUMMARY'
    | 'LOG_BOOKS'
    | 'CLOSING_DOCS_INDEX'
    | 'CPA_PACKAGE_BUNDLE'
    | 'CAPEX_TRACKER';
  title: string;
  category: ReportCategory;
  description: string;
  badge?: string;
  preview?: Array<{ label: string; value: string }>;
}

/** Ported from PaperWorking `ReportCatalogGrid` REPORT_CATALOG. */
export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: 'PL',
    title: 'Profit & Loss Statement (P&L)',
    category: 'Monthly',
    description:
      'Consolidated or per-property P&L detailing gross rental income, itemized operating expenses, and Net Operating Income (NOI).',
    badge: 'Core Financial',
    preview: [
      { label: 'Gross rent', value: '$18,400' },
      { label: 'OpEx', value: '$7,120' },
      { label: 'NOI', value: '$11,280' },
    ],
  },
  {
    id: 'BALANCE_SHEET',
    title: 'Balance Sheet',
    category: 'Monthly',
    description:
      'Current property values (assets), mortgage balances (liabilities), security deposit liabilities, and computed owner equity.',
    badge: 'Assets & Liabilities',
    preview: [
      { label: 'Assets', value: '$2.64M' },
      { label: 'Liabilities', value: '$1.81M' },
      { label: 'Equity', value: '$830K' },
    ],
  },
  {
    id: 'CASH_FLOW',
    title: 'Cash Flow Statement',
    category: 'Monthly',
    description:
      'Spendable cash vs paper profit — starts at NOI, breaking out loan principal paydown and CapEx separately.',
    badge: 'Cash Flow',
    preview: [
      { label: 'NOI', value: '$11,280' },
      { label: 'Debt service', value: '$6,420' },
      { label: 'Distributable', value: '$4,860' },
    ],
  },
  {
    id: 'RENT_ROLL',
    title: 'Rent Roll & Delinquency Report',
    category: 'Monthly',
    description:
      'Active tenant leases, rent amounts, lease terms, vacancies, and unit delinquency status.',
    badge: 'Occupancy & Revenue',
    preview: [
      { label: 'Units', value: '12' },
      { label: 'Occupied', value: '96.8%' },
      { label: 'Delinquent', value: '1' },
    ],
  },
  {
    id: 'TAX_1040ES',
    title: '1040-ES Quarterly Estimated Tax Voucher',
    category: 'Quarterly',
    description:
      'Estimated quarterly payment worksheet based on YTD portfolio income with mandatory CPA disclaimer.',
    badge: 'Quarterly Tax',
    preview: [
      { label: 'Est. liability', value: '$18,400' },
      { label: 'Safe harbor', value: 'Met' },
      { label: 'Next due', value: 'Sep 15' },
    ],
  },
  {
    id: 'BUDGET_VS_ACTUALS',
    title: 'Quarterly Budget vs. Actuals Variance Report',
    category: 'Quarterly',
    description:
      'Property performance vs frozen budget baselines, itemizing repairs/maintenance variance and reserve adjustments.',
    badge: 'Variance & Operations',
    preview: [
      { label: 'Budget', value: '$42,000' },
      { label: 'Actual', value: '$44,180' },
      { label: 'Variance', value: '+5.2%' },
    ],
  },
  {
    id: 'SCHEDULE_E',
    title: 'Schedule E-Mapped Income Statement',
    category: 'Annual',
    description:
      'Every income and expense category mapped to exactly one IRS Schedule E line for 1040 tax preparation.',
    badge: 'IRS Tax Schedule',
    preview: [
      { label: 'Rents received', value: '$220,800' },
      { label: 'Total expenses', value: '$136,600' },
      { label: 'Net income', value: '$84,200' },
    ],
  },
  {
    id: 'DEPRECIATION_SCHEDULE',
    title: 'Depreciation & Asset Schedule',
    category: 'Annual',
    description:
      'Property cost basis, land value separation, 27.5-year MACRS straight-line depreciation, and accumulated depreciation.',
    badge: 'Tax Depreciation',
    preview: [
      { label: 'Basis', value: '$1.92M' },
      { label: 'Land', value: '$384K' },
      { label: 'YTD dep.', value: '$42,500' },
    ],
  },
  {
    id: 'FORM_1099_SUMMARY',
    title: 'Form 1099 Contractor Summary',
    category: 'Annual',
    description:
      'Contractors and vendors paid over the $600 IRS reporting threshold with 1099-NEC/MISC filing requirements.',
    badge: '1099 Tax Filing',
    preview: [
      { label: 'Vendors >$600', value: '8' },
      { label: 'Total paid', value: '$86,400' },
      { label: '1099s due', value: '8' },
    ],
  },
  {
    id: 'LOG_BOOKS',
    title: 'Mileage & REPS Time Log Books',
    category: 'Annual',
    description:
      'Standard mileage travel log and Real Estate Professional Status (REPS) 750-hour material participation log.',
    badge: 'Audit & Compliance',
  },
  {
    id: 'CLOSING_DOCS_INDEX',
    title: 'Closing Statements & Loan Documents Index',
    category: 'Annual',
    description:
      'Index of HUD-1 settlement statements, closing disclosures, promissory notes, and deeds for the tax year.',
    badge: 'Document Index',
  },
  {
    id: 'CPA_PACKAGE_BUNDLE',
    title: 'One-Click CPA Annual Tax Package',
    category: 'Annual',
    description:
      'Bundled package containing Schedule E, Depreciation Schedule, 1099 Summary, Log Books, and Closing Document Index.',
    badge: 'One-Click Tax Bundle',
  },
  {
    id: 'SREO',
    title: 'Schedule of Real Estate Owned (SREO)',
    category: 'Lender (SREO)',
    description:
      'Lender-compliant Schedule of Real Estate Owned listing all portfolio properties, market values, debt balances, and NOI.',
    badge: 'Lender & Underwriting',
    preview: [
      { label: 'Properties', value: '3' },
      { label: 'Market value', value: '$2.64M' },
      { label: 'Debt', value: '$1.81M' },
    ],
  },
  {
    id: 'CAPEX_TRACKER',
    title: 'Capital Expenditures (CapEx) Tracker',
    category: 'Lender (SREO)',
    description:
      'Major renovation overhauls isolated from operating expenses with per-asset status and budget tracking.',
    badge: 'Capital Assets',
    preview: [
      { label: 'In progress', value: '1' },
      { label: 'Budget', value: '$62,000' },
      { label: 'Spent', value: '$41,200' },
    ],
  },
];

export type PeriodTab = 'Monthly' | 'Quarterly' | 'Yearly' | 'Overall' | 'By Property';

export const PERIOD_TABS: PeriodTab[] = [
  'Monthly',
  'Quarterly',
  'Yearly',
  'Overall',
  'By Property',
];

export const TAB_CATEGORIES: Record<PeriodTab, ReportCategory[]> = {
  Monthly: ['Monthly'],
  Quarterly: ['Quarterly'],
  Yearly: ['Annual'],
  Overall: ['Monthly', 'Quarterly', 'Annual', 'Lender (SREO)'],
  'By Property': ['Monthly', 'Quarterly', 'Annual', 'Lender (SREO)'],
};

/** Fixture data lives in /mockdata — re-exported for existing catalog imports. */
export { PHASE_BREAKDOWN_SEED } from '../../../../mockdata/reports/phase-breakdown';
