import type { FaqEntry, GlossaryTerm } from './types';

export const CANONICAL_FAQ_SEED: FaqEntry[] = [
  {
    id: 'faq-projects',
    question: 'How does a Project workspace in PaperWorking differ from generic task managers?',
    answer:
      'Unlike generic project managers, every PaperWorking Project is organized around the Real Estate Investment Lifecycle (REIL). Each project links contingency deadlines directly to earnest money release dates, maps contractor draw milestones to your rehabilitation budget, and automatically converts daily operational expense entries into institutional KPIs and tax-ready Schedule E ledgers.',
    category: 'Platform',
    order: 1,
  },
  {
    id: 'faq-reil-overview',
    question: 'What is the Real Estate Investment Lifecycle (REIL)?',
    answer:
      'The Real Estate Investment Lifecycle (REIL) is PaperWorking’s four-phase operational framework: Phase 01 Acquisition (opportunity sourcing, comps, and underwriting), Phase 02 Fund (capital stack assembly, earnest money escrow, and transaction documentation), Phase 03 Hold (rehab execution, draw schedules, and holding cost tracking), and Phase 04 Exit (disposition via sale, lease-up, refinance, or commercial operation with an audit-ready track record).',
    category: 'REIL',
    order: 2,
  },
  {
    id: 'faq-acquisition',
    question: 'How does the Acquisition phase streamline deal sourcing and underwriting?',
    answer:
      'During Acquisition, you can input property addresses to pull automated tax assessments and valuations, stress-test purchase models in the Deal Calculator, and gauge co-investor appetite in the Deal Marketplace before signing purchase and sale contracts or waiving diligence contingencies.',
    category: 'REIL',
    order: 3,
  },
  {
    id: 'faq-fund',
    question: 'What happens in the Fund phase to protect earnest money and documents?',
    answer:
      'The Fund phase acts as your transaction vault. It coordinates equity commitments and lender term sheets, establishes hard dates for inspection and appraisal contingencies, tracks earnest money deposits, and issues automated alerts 72h, 48h, and 24h before deposit dates go hard.',
    category: 'REIL',
    order: 4,
  },
  {
    id: 'faq-hold',
    question: 'How does the Hold phase track rehabilitation budgets and holding costs in real time?',
    answer:
      'The Hold phase monitors active assets with a live Holding Cost Clock that tracks daily capital burn (interest, taxes, insurance, utilities). Milestone-based draw schedules keep contractor payments strictly tied to completed field inspections, ensuring budget-vs-actual variance stays transparent.',
    category: 'REIL',
    order: 5,
  },
  {
    id: 'faq-exit',
    question: 'What disposition strategies are supported in the Exit phase?',
    answer:
      'The Exit phase supports complete asset sales, 1031 exchanges, long-term residential leases, short-term/Airbnb rentals, and commercial pop-ups. When ready to exit, PaperWorking compiles an immutable track record that buyers, lenders, and appraisers rely on for underwriting.',
    category: 'REIL',
    order: 6,
  },
  {
    id: 'faq-deal-calculator',
    question: 'What metrics does the integrated Deal Calculator compute?',
    answer:
      'The Deal Calculator models 33 institutional metrics in real time, including After-Repair Value (ARV), Cap Rate, Cash-on-Cash Return, Levered and Unlevered IRR, Net Operating Income (NOI), Debt Service Coverage Ratio (DSCR), Break-Even Occupancy, and Net Sales Proceeds based on custom debt structures and operational expense assumptions.',
    category: 'Underwriting',
    order: 7,
  },
  {
    id: 'faq-portfolio-insights',
    question: 'What analytics are available in Portfolio Insights?',
    answer:
      'Portfolio Insights aggregates performance across all your active and exited projects. You get instant visibility into total capital deployed, aggregate cash-on-cash yield, portfolio-wide debt maturity schedules, geographic asset distribution, and budget variance by contractor trade.',
    category: 'Underwriting',
    order: 8,
  },
  {
    id: 'faq-pricing-plans',
    question: 'How does PaperWorking subscription and billing work?',
    answer:
      'PaperWorking provides tailored subscription tiers: Investor (for solo operators managing personal portfolios), Investment Team (for syndicators and multi-partner investment firms), and Vendor (for verified appraisers, contractors, and lenders). All accounts start with a full-featured 14-day free trial with no commitment.',
    category: 'Billing',
    order: 9,
  },
  {
    id: 'faq-team-members',
    question: 'Can I invite outside collaborators like CPAs, attorneys, or lenders?',
    answer:
      'Yes. All paid plans include unlimited complimentary read-only seats for external professionals like CPAs, title attorneys, and commercial lenders. You can also grant role-based edit access to internal team members, acquisitions analysts, and project managers.',
    category: 'Collaboration',
    order: 10,
  },
  {
    id: 'faq-contingency-deadlines',
    question: 'How do automated contingency deadline alerts protect investors?',
    answer:
      'Entering your contract execution date automatically establishes timelines for title review, physical inspection, environmental assessments, and financing commitments. The system triggers multi-channel notifications (in-app and email) before deposit dates go hard, preventing accidental earnest money forfeiture.',
    category: 'Platform',
    order: 11,
  },
  {
    id: 'faq-tax-exports',
    question: 'Can I export tax-ready financial statements for accounting and CPA filing?',
    answer:
      'Yes. PaperWorking generates one-click, standardized financial exports mapped directly to IRS Schedule E (for rental operating income and expenses) and Form 4797 (for capital gains and depreciation recapture on property sales), supported by a complete digital receipt and invoice ledger.',
    category: 'Platform',
    order: 12,
  },
  {
    id: 'faq-deal-marketplace',
    question: 'How can I syndicate investment opportunities in the Deal Marketplace?',
    answer:
      'Active subscribers can showcase deal underwriting baselines in the Deal Marketplace to track soft equity pledges and partner with verified co-investors. Deals can be kept private, restricted to invited syndication circles, or broadcast publicly without transaction fees.',
    category: 'Collaboration',
    order: 13,
  },
  {
    id: 'faq-offline-mode',
    question: 'Does PaperWorking support offline job-site inspections?',
    answer:
      'Yes. PaperWorking includes offline PWA caching designed for physical walkthroughs in basements, rural land parcels, or properties without cellular signal. Checklists, photos, and expense notes save locally and automatically sync as soon as network connectivity is restored.',
    category: 'Platform',
    order: 14,
  },
];

export const CANONICAL_GLOSSARY_SEED: GlossaryTerm[] = [
  {
    id: 'acquisition',
    term: 'Acquisition',
    definition:
      'Phase 01 of the Real Estate Investment Lifecycle (REIL). Focuses on opportunity sourcing, Deal Calculator stress-testing, automated tax and valuation comp analysis, and purchase underwriting before entering contract.',
    category: 'REIL Phase',
    order: 1,
  },
  {
    id: 'after-repair-value-arv',
    term: 'After-Repair Value (ARV)',
    definition:
      'The estimated fair market value of an investment property once all planned renovations, structural remediations, and capital improvements have been completed.',
    category: 'Financial Metric',
    order: 2,
  },
  {
    id: 'capital-expenditures-capex',
    term: 'Capital Expenditures (CapEx)',
    definition:
      'Substantial funds invested by an owner to upgrade, replace, or significantly extend the useful economic life of a fixed asset or major structural building component (e.g., roof, HVAC, plumbing mains).',
    category: 'Financial Metric',
    order: 3,
  },
  {
    id: 'cap-rate-on-cost',
    term: 'Cap Rate on Cost (Yield on Cost)',
    definition:
      'Year-1 Net Operating Income (NOI) divided by Total Property Cost Basis (Purchase Price + Closing Costs + Rehab Budget). Represents the unleveraged cash yield on total capital deployed into the deal.',
    category: 'Financial Metric',
    order: 4,
  },
  {
    id: 'market-cap-rate',
    term: 'Market Cap Rate',
    definition:
      'Net Operating Income (NOI) divided by Current Market Value or Purchase Price. Represents the baseline capitalization rate expected by the open market for similar stabilized properties.',
    category: 'Financial Metric',
    order: 5,
  },
  {
    id: 'cap-rate-capitalization-rate',
    term: 'Cap Rate (Capitalization Rate)',
    definition:
      'A fundamental real estate metric expressing the unleveraged annual rate of return generated by an asset: Net Operating Income (NOI) divided by total cost (Cap Rate on Cost) or market value (Market Cap Rate).',
    category: 'Financial Metric',
    order: 6,
  },
  {
    id: 'cash-on-cash-return',
    term: 'Cash-on-Cash Return',
    definition:
      'The percentage return calculating annual pre-tax cash flow received divided by the total initial equity cash invested, demonstrating the direct impact of debt financing on cash yields.',
    category: 'Financial Metric',
    order: 5,
  },
  {
    id: 'contingency',
    term: 'Contingency',
    definition:
      'A specific contractual provision in a purchase agreement allowing an investor to exit the contract and recover earnest money without penalty if stipulated conditions (e.g., structural inspection, title review, appraisal, financing commitment) are not met before the agreed deadline.',
    category: 'Contract & Legal',
    order: 6,
  },
  {
    id: 'deal-calculator',
    term: 'Deal Calculator',
    definition:
      'PaperWorking’s real-time underwriting engine that computes 33 institutional metrics from acquisition cost baselines, construction scopes, financing debt terms, and operational income assumptions.',
    category: 'Platform Entity',
    order: 7,
  },
  {
    id: 'debt-service-coverage-ratio-dscr',
    term: 'Debt Service Coverage Ratio (DSCR)',
    definition:
      'The relationship between annual Net Operating Income (NOI) and total annual debt service payments (principal and interest). Lenders generally require a DSCR above 1.25x to ensure an adequate cash buffer.',
    category: 'Financial Metric',
    order: 8,
  },
  {
    id: 'earnest-money',
    term: 'Earnest Money',
    definition:
      'A monetary deposit submitted by a buyer upon executing a purchase contract to demonstrate good faith commitment. It is held in escrow until closing or released/forfeited according to contingency deadline terms.',
    category: 'Contract & Legal',
    order: 9,
  },
  {
    id: 'equity-multiple-moic',
    term: 'Equity Multiple (MOIC)',
    definition:
      'The total cash return generated over the life of an investment divided by the total equity capital invested. An equity multiple of 2.0x indicates the investor doubled their invested capital.',
    category: 'Financial Metric',
    order: 10,
  },
  {
    id: 'exit',
    term: 'Exit',
    definition:
      'Phase 04 of the Real Estate Investment Lifecycle (REIL). Executing the ultimate disposition strategy, including complete arm’s-length sale, 1031 exchange, long-term leasing, short-term rental, or refinancing.',
    category: 'REIL Phase',
    order: 11,
  },
  {
    id: 'fund',
    term: 'Fund',
    definition:
      'Phase 02 of the Real Estate Investment Lifecycle (REIL). Assembling the project capital stack (equity commitments and debt term sheets), securing escrow deposits, and compiling mandatory closing paperwork into a centralized vault.',
    category: 'REIL Phase',
    order: 12,
  },
  {
    id: 'hold',
    term: 'Hold',
    definition:
      'Phase 03 of the Real Estate Investment Lifecycle (REIL). Managing ongoing renovations, tracking contractor draw disbursements, monitoring operating revenues, and measuring daily capital burn via the Holding Cost Clock.',
    category: 'REIL Phase',
    order: 13,
  },
  {
    id: 'holding-costs',
    term: 'Holding Costs',
    definition:
      'Ongoing recurring expenses accrued daily while owning an asset prior to tenant stabilization or exit, including loan interest, property taxes, builder’s risk insurance, utilities, and security.',
    category: 'Financial Metric',
    order: 14,
  },
  {
    id: 'internal-rate-of-return-irr',
    term: 'Internal Rate of Return (IRR)',
    definition:
      'The annualized compounded rate of return that equates the net present value of all cash inflows and outflows (including periodic cash distributions and exit sale proceeds) to zero.',
    category: 'Financial Metric',
    order: 15,
  },
  {
    id: 'loan-to-value-ltv',
    term: 'Loan-to-Value (LTV)',
    definition:
      'The ratio of first-mortgage debt financing relative to the appraised value or purchase price of the underlying property, used by lenders to calibrate downside risk exposure.',
    category: 'Financial Metric',
    order: 16,
  },
  {
    id: 'net-operating-income-noi',
    term: 'Net Operating Income (NOI)',
    definition:
      'Total effective gross income collected from real estate operations minus all necessary operational expenses, before deducting mortgage debt service and income taxes.',
    category: 'Financial Metric',
    order: 17,
  },
  {
    id: 'project',
    term: 'Project',
    definition:
      'The central operational activity in PaperWorking. A unified workspace for a single real estate investment containing tasks, contingency calendars, contractor bids, receipt ledgers, and live KPI feeds.',
    category: 'Platform Entity',
    order: 18,
  },
  {
    id: 'real-estate-investment-lifecycle-reil',
    term: 'Real Estate Investment Lifecycle (REIL)',
    definition:
      'A structured four-phase operational system engineered for serious real estate investors: Phase 01 Acquisition, Phase 02 Fund, Phase 03 Hold, and Phase 04 Exit.',
    category: 'REIL Phase',
    order: 19,
  },
  {
    id: 'rehab-budget',
    term: 'Rehab Budget',
    definition:
      'The total capital allocated to complete construction, architectural scopes, material procurement, contractor draws, and contingency allowances required to transition a property to its After-Repair Value.',
    category: 'Financial Metric',
    order: 20,
  },
  {
    id: 'schedule-e-export',
    term: 'Schedule E Export',
    definition:
      'A one-click tax report produced by PaperWorking that categorizes all rental revenues and holding expenses directly into IRS Form 1040 Schedule E line items with an immutable ledger trail.',
    category: 'Platform Entity',
    order: 21,
  },
  {
    id: 'syndication',
    term: 'Syndication',
    definition:
      'Pooling capital from multiple accredited or validated co-investors to fund larger acquisitions, managed through PaperWorking’s Deal Marketplace with real-time soft equity commitment tracking.',
    category: 'Contract & Legal',
    order: 22,
  },
];
