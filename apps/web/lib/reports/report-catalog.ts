export type ReportSection = 'Core Financial' | 'Tax Preparation';

export type ReportId =
  | 'PL'
  | 'BALANCE_SHEET'
  | 'CASH_FLOW'
  | 'RENT_ROLL'
  | 'SCHEDULE_E'
  | 'DEPRECIATION_SCHEDULE'
  | 'FORM_1099_SUMMARY'
  | 'CAPEX_LOG'
  | 'CAPEX_TRACKER'; // Alias for CAPEX_LOG

export interface ReportCatalogItem {
  id: ReportId;
  title: string;
  section: ReportSection;
  categoryTag: string;
  description: string;
  dataThrough: string;
  preview?: Array<{ label: string; value: string }>;
}

export const REPORT_SECTIONS: ReportSection[] = [
  'Core Financial',
  'Tax Preparation',
];

/**
 * Authoritative 8-report catalog for PaperWorking Reports tab.
 * Grouped into Core Financial and Tax Preparation sections.
 */
export const REPORT_CATALOG: ReportCatalogItem[] = [
  // SECTION 1: CORE FINANCIAL
  {
    id: 'PL',
    title: 'Profit & Loss Statement (P&L)',
    section: 'Core Financial',
    categoryTag: 'Income Statement',
    description:
      'Chronological CRE income statement: gross scheduled rent, vacancy loss, other income, GOI, itemized OpEx, NOI, debt service, and cash flow before tax.',
    dataThrough: 'Aug 2026',
    preview: [
      { label: 'GSR', value: '$24,000' },
      { label: 'NOI', value: '$12,485' },
      { label: 'CFBT', value: '($4,444)' },
    ],
  },
  {
    id: 'BALANCE_SHEET',
    title: 'Balance Sheet',
    section: 'Core Financial',
    categoryTag: 'Assets & Liabilities',
    description:
      'Asset cost basis and market value vs amortizing mortgage debt liabilities, tenant security deposits held, and computed owner equity per period.',
    dataThrough: 'Aug 2026',
    preview: [
      { label: 'Asset basis', value: '$279K' },
      { label: 'Debt balance', value: '$223K' },
      { label: 'Net equity', value: '$55.8K' },
    ],
  },
  {
    id: 'CASH_FLOW',
    title: 'Cash Flow Statement',
    section: 'Core Financial',
    categoryTag: 'Cash Flow',
    description:
      'Spendable cash vs paper accounting profit: starts at NOI, breaking out loan principal paydown, interest expense, and CapEx reserves separately.',
    dataThrough: 'Aug 2026',
    preview: [
      { label: 'Operating cash', value: '$12,485' },
      { label: 'Debt service', value: '$16,929' },
      { label: 'CapEx reserve', value: '$1,200' },
    ],
  },
  {
    id: 'RENT_ROLL',
    title: 'Rent Roll & Tenant Ledger',
    section: 'Core Financial',
    categoryTag: 'Leasing & Tenancy',
    description:
      'Unit-by-unit rent roll, tenant names, lease start/end dates, monthly rent, deposits held, occupancy %, and chronological payment ledgers.',
    dataThrough: 'Aug 2026',
    preview: [
      { label: 'Occupancy', value: '100%' },
      { label: 'Units', value: '1' },
      { label: 'GPR vs leased', value: '100%' },
    ],
  },

  // SECTION 2: TAX PREPARATION
  {
    id: 'SCHEDULE_E',
    title: 'Schedule E Summary',
    section: 'Tax Preparation',
    categoryTag: 'IRS Form 1040',
    description:
      'Every income and operating expense category mapped strictly to official IRS Form 1040 Schedule E line items (Line 3 through Line 19) for CPA preparation.',
    dataThrough: 'FY 2026',
    preview: [
      { label: 'Rents received', value: '$23,280' },
      { label: 'Schedule E OpEx', value: '$10,795' },
      { label: 'Net rental income', value: '$12,485' },
    ],
  },
  {
    id: 'DEPRECIATION_SCHEDULE',
    title: 'Depreciation Schedule',
    section: 'Tax Preparation',
    categoryTag: 'MACRS Straight-Line',
    description:
      'IRS MACRS straight-line depreciation (27.5-yr residential / 39-yr commercial) with land vs improvement split, mid-month convention, and multi-asset tracking.',
    dataThrough: 'FY 2026',
    preview: [
      { label: 'Improvement basis', value: '$223.2K' },
      { label: 'Recovery period', value: '27.5 yrs' },
      { label: 'Yr 1 depreciation', value: '$8,116' },
    ],
  },
  {
    id: 'FORM_1099_SUMMARY',
    title: '1099 & Vendor Payments',
    section: 'Tax Preparation',
    categoryTag: 'Form 1099-NEC',
    description:
      'Payments to contractors, handymen, and property managers grouped by payee with annual totals and automatic $600 IRS reporting threshold flag.',
    dataThrough: 'FY 2026',
    preview: [
      { label: 'Threshold', value: '$600' },
      { label: 'Form', value: '1099-NEC' },
      { label: 'Status', value: 'Requires records' },
    ],
  },
  {
    id: 'CAPEX_LOG',
    title: 'CapEx Log',
    section: 'Tax Preparation',
    categoryTag: 'Capital Assets',
    description:
      'Major capital improvements separated from routine repairs for tax basis adjustments, each linked to depreciation recovery schedules and rehab budgets.',
    dataThrough: 'FY 2026',
    preview: [
      { label: 'Capitalized', value: '$1,200' },
      { label: 'Expensed repairs', value: '$1,995' },
      { label: 'Asset class', value: '15-yr QIP' },
    ],
  },
];
