import { 
  Briefcase, 
  Calculator, 
  FileSignature, 
  HardHat, 
  Building, 
  Landmark,
  Target,
  FileCheck,
  Wrench,
  TrendingUp
} from 'lucide-react';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: any; // LucideIcon component
}

export interface SupportArticle {
  id: string;
  categoryId: string;
  title: string;
  excerpt: string;
  readTime: string;
  content: string; // HTML or Markdown string for the full article
}

export interface SupportFAQ {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
}

// ── Categories ─────────────────────────────────────────────────────────────

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'find-and-fund',
    title: 'Phase 1: Acquisition',
    description: 'Sourcing, LOIs, and Crowdfunding.',
    icon: Target,
  },
  {
    id: 'acquisition',
    title: 'Phase 2: Purchase',
    description: 'Due diligence, Contingencies, and Closing Docs.',
    icon: FileCheck,
  },
  {
    id: 'rehab',
    title: 'Phase 3: Hold',
    description: 'Rehab tracking, Burn Rate ledgers, and Vendor Milestones.',
    icon: Wrench,
  },
  {
    id: 'exit',
    title: 'Phase 4: Exit',
    description: 'Settlement ledgers, Net Proceeds, and Tax Exports.',
    icon: TrendingUp,
  },
  {
    id: 'financials',
    title: 'Financial Reporting',
    description: 'Cost Basis Ledgers, P&L Statements, and ROI tracking.',
    icon: Calculator,
  },
  {
    id: 'compliance',
    title: 'Legal & Compliance',
    description: 'Role-Linked Documents, Chain of Title, and Entity structures.',
    icon: FileSignature,
  },
];

// ── Articles ───────────────────────────────────────────────────────────────

export const SUPPORT_ARTICLES: SupportArticle[] = [
  // Phase 1: Acquisition (find-and-fund)
  {
    id: 'generating-an-loi',
    categoryId: 'find-and-fund',
    title: 'Generating an LOI for Fractional Investors',
    excerpt: 'Learn how to generate and distribute a Letter of Intent (LOI) to syndication partners through the Guest Portal.',
    readTime: '4 min',
    content: '<p>The Syndication Engine allows you to convert Funding Pledges into formal Letters of Intent...</p>',
  },
  {
    id: 'underwriting-criteria',
    categoryId: 'find-and-fund',
    title: 'Underwriting & Deal Analysis Criteria',
    excerpt: 'Set up your criteria for analyzing cash flow, ROI, and risk profiles before making an offer.',
    readTime: '5 min',
    content: '<p>Robust underwriting is the foundation of any successful deal. This guide walks you through establishing metrics...</p>',
  },
  {
    id: 'sourcing-off-market',
    categoryId: 'find-and-fund',
    title: 'Sourcing Off-Market Deals',
    excerpt: 'Strategies for leveraging the platform to track and manage off-market property leads.',
    readTime: '6 min',
    content: '<p>Managing your pipeline of off-market properties requires diligence. Use the prospect tracker to...</p>',
  },
  {
    id: 'initializing-syndicate',
    categoryId: 'find-and-fund',
    title: 'Initializing a Capital Syndicate',
    excerpt: 'How to invite investors and collect soft commitments for your next real estate project.',
    readTime: '7 min',
    content: '<p>When a deal looks promising, you can create a Capital Syndicate room to invite previous investors...</p>',
  },
  {
    id: 'crafting-offer-letter',
    categoryId: 'find-and-fund',
    title: 'Crafting the Perfect Offer Letter',
    excerpt: 'Utilize our built-in templates to submit strong, contingency-aware offers to sellers.',
    readTime: '4 min',
    content: '<p>The Offer Generation tool allows you to pull directly from your underwriting model to craft a compelling offer...</p>',
  },

  // Phase 2: Purchase (acquisition)
  {
    id: 'managing-contingency-deadlines',
    categoryId: 'acquisition',
    title: 'Managing Due Diligence Contingency Deadlines',
    excerpt: 'Configure alerts for Inspection, Financing, and Appraisal contingencies to protect your Earnest Money Deposit (EMD).',
    readTime: '3 min',
    content: '<p>Missing a contingency deadline can put your EMD at risk. The Contingency Tracker ensures...</p>',
  },
  {
    id: 'title-search-basics',
    categoryId: 'acquisition',
    title: 'Title Search & Chain of Title Basics',
    excerpt: 'What to look for when reviewing title commitments and ensuring a clean transfer of ownership.',
    readTime: '5 min',
    content: '<p>A clean title is crucial. In Phase 2, document all title exceptions and ensure your closing attorney...</p>',
  },
  {
    id: 'coordinating-inspections',
    categoryId: 'acquisition',
    title: 'Coordinating Appraisals & Inspections',
    excerpt: 'Schedule and track third-party reports required by your lender during the purchase phase.',
    readTime: '4 min',
    content: '<p>Keep your lender requirements in check by utilizing the Task Manager to track appraisals and inspections...</p>',
  },
  {
    id: 'securing-bridge-loans',
    categoryId: 'acquisition',
    title: 'Securing Hard Money or Bridge Loans',
    excerpt: 'Manage loan term sheets, points, and origination fees within your capital stack.',
    readTime: '6 min',
    content: '<p>Inputting your loan terms accurately during Phase 2 ensures the burn rate calculations in Phase 3 are correct...</p>',
  },
  {
    id: 'closing-document-checklist',
    categoryId: 'acquisition',
    title: 'Closing Document Checklist',
    excerpt: 'A comprehensive checklist to ensure you have all required signatures before funding.',
    readTime: '4 min',
    content: '<p>Use the Phase 2 Closing Checklist to verify that the deed, HUD-1, and operating agreements are executed...</p>',
  },

  // Phase 3: Hold (rehab)
  {
    id: 'tracking-holding-costs',
    categoryId: 'rehab',
    title: 'Tracking Holding Costs During Renovation',
    excerpt: 'Set up recurring monthly ledgers for Property Taxes, Insurance, Utilities, and HOA fees to maintain accurate burn rates.',
    readTime: '6 min',
    content: '<p>During Phase 3, the Holding Cost clock begins automatically upon acquisition. To log a recurring expense...</p>',
  },
  {
    id: 'capex-reconciliation',
    categoryId: 'rehab',
    title: 'CapEx Reconciliation & Escrow Draws',
    excerpt: 'How to manage the workflow between General Contractors submitting receipts and Lenders authorizing Escrow Draws.',
    readTime: '8 min',
    content: '<p>Capital Expenditure (CapEx) tracking in PaperWorking bridges the gap between field logistics and financing...</p>',
  },
  {
    id: 'contractor-bids-milestones',
    categoryId: 'rehab',
    title: 'Managing Contractor Bids & Milestones',
    excerpt: 'Compare bids, assign scopes of work, and track construction progress against your budget.',
    readTime: '5 min',
    content: '<p>The Vendor Portal allows general contractors to submit bids directly against your detailed Scope of Work...</p>',
  },
  {
    id: 'permitting-signoffs',
    categoryId: 'rehab',
    title: 'Permitting and Inspection Sign-offs',
    excerpt: 'Track local municipality permits and ensure rough-in and final inspections pass on time.',
    readTime: '4 min',
    content: '<p>Avoid costly delays by logging all required municipal permits and their status in the Phase 3 tracker...</p>',
  },
  {
    id: 'material-procurement',
    categoryId: 'rehab',
    title: 'Material Procurement and Budget Tracking',
    excerpt: 'Log material orders, track delivery dates, and reconcile against the initial CapEx budget.',
    readTime: '5 min',
    content: '<p>By entering purchase orders for major materials (e.g., cabinets, flooring), you can predict cash flow needs...</p>',
  },

  // Phase 4: Exit (exit)
  {
    id: 'settlement-ledger-prorations',
    categoryId: 'exit',
    title: 'Managing the Settlement Ledger and Prorations',
    excerpt: 'Automate buyer/seller credits and calculate prorated escrow for property taxes and utilities prior to closing.',
    readTime: '5 min',
    content: '<p>The Phase 4 Exit Dashboard centralizes all final costs. When preparing for disposition, the Settlement Ledger...</p>',
  },
  {
    id: 'final-roi-calculation',
    categoryId: 'exit',
    title: 'Final Reconciliation & ROI Calculation',
    excerpt: 'Generate the final project report detailing exact IRR, Cash-on-Cash return, and total profit.',
    readTime: '6 min',
    content: '<p>Once all holding and exit costs are logged, the platform calculates your finalized return metrics...</p>',
  },
  {
    id: 'refinance-vs-sale',
    categoryId: 'exit',
    title: 'Refinance vs. Sale Analysis',
    excerpt: 'Use the exit scenario modeling tool to decide between cashing out or holding as a rental.',
    readTime: '7 min',
    content: '<p>Before committing to an exit strategy, run the Refinance vs. Sale models to see which yields a better after-tax return...</p>',
  },
  {
    id: 'estimating-capital-gains',
    categoryId: 'exit',
    title: 'Estimating Capital Gains Taxes',
    excerpt: 'Understand short-term vs. long-term holding impacts on your final net proceeds.',
    readTime: '4 min',
    content: '<p>The integrated tax estimator uses your entity\'s tax bracket to project capital gains liabilities upon sale...</p>',
  },
  {
    id: 'distributing-net-proceeds',
    categoryId: 'exit',
    title: 'Distributing Net Proceeds to Investors',
    excerpt: 'Generate distribution statements and process final payouts to your capital syndicate.',
    readTime: '5 min',
    content: '<p>With a click of a button, generate individualized K-1 data prep sheets and distribution ledgers for each investor...</p>',
  },

  // Financial Reporting (financials)
  {
    id: 'generating-pl-statement',
    categoryId: 'financials',
    title: 'Generating a Profit & Loss (P&L) Statement',
    excerpt: 'Export clean, CPA-ready financial statements for your individual properties or portfolio.',
    readTime: '3 min',
    content: '<p>Access the Engine Room to instantly generate standard P&L reports formatted for tax preparation...</p>',
  },
  {
    id: 'cost-basis-ledger',
    categoryId: 'financials',
    title: 'Understanding the Cost Basis Ledger',
    excerpt: 'Learn how acquisition costs, CapEx, and holding costs roll up into your final cost basis.',
    readTime: '6 min',
    content: '<p>Your cost basis is constantly evolving. The platform automatically aggregates these figures from Phase 1-3...</p>',
  },
  {
    id: 'reconciling-bank-feeds',
    categoryId: 'financials',
    title: 'Reconciling Bank Feeds',
    excerpt: 'Match platform transactions with your connected bank accounts to ensure accuracy.',
    readTime: '5 min',
    content: '<p>Use the reconciliation tool to match logged expenses with actual bank outflow, catching any discrepancies...</p>',
  },
  {
    id: 'tax-export-integration',
    categoryId: 'financials',
    title: 'Tax Export Integration',
    excerpt: 'Export your financial data directly to popular accounting software like QuickBooks.',
    readTime: '4 min',
    content: '<p>Save time during tax season by utilizing our direct CSV exports formatted for major accounting platforms...</p>',
  },
  {
    id: 'monthly-escrow-reserves',
    categoryId: 'financials',
    title: 'Setting up Monthly Escrow Reserves',
    excerpt: 'Ensure you have adequate cash reserves for upcoming property tax and insurance bills.',
    readTime: '4 min',
    content: '<p>Proper reserve management prevents cash flow crunches. Learn how to allocate funds to your escrow bucket...</p>',
  },

  // Legal & Compliance (compliance)
  {
    id: 'llc-structuring',
    categoryId: 'compliance',
    title: 'LLC Structuring & Entity Management',
    excerpt: 'Organize your Series LLCs and joint ventures for maximum liability protection.',
    readTime: '7 min',
    content: '<p>Document your corporate structure and assign properties to their respective holding entities within the platform...</p>',
  },
  {
    id: 'role-linked-access',
    categoryId: 'compliance',
    title: 'Managing Role-Linked Access Controls',
    excerpt: 'Ensure sensitive financial data is only visible to authorized partners and accountants.',
    readTime: '4 min',
    content: '<p>Role-Based Access Control (RBAC) ensures your contractors only see scopes of work, while investors see financials...</p>',
  },
  {
    id: 'preparing-ppm',
    categoryId: 'compliance',
    title: 'Preparing the Private Placement Memorandum (PPM)',
    excerpt: 'Securely host and distribute SEC-compliant offering documents for your syndicate.',
    readTime: '6 min',
    content: '<p>Upload your drafted PPMs into the Document Vault to capture e-signatures from your LP investors...</p>',
  },
  {
    id: 'annual-reporting',
    categoryId: 'compliance',
    title: 'Annual Reporting and Tax Filings',
    excerpt: 'Track deadlines for state franchise taxes and annual LLC reports.',
    readTime: '3 min',
    content: '<p>Avoid bad standing with the state by utilizing the compliance calendar to track all entity renewal dates...</p>',
  },
  {
    id: 'vendor-insurance-liens',
    categoryId: 'compliance',
    title: 'Vendor Insurance and Lien Waivers',
    excerpt: 'Collect W-9s, Certificates of Insurance, and Lien Waivers from all contractors.',
    readTime: '5 min',
    content: '<p>Before authorizing any draw payments, ensure the contractor has uploaded a signed unconditional lien waiver...</p>',
  }
];

// ── FAQs ───────────────────────────────────────────────────────────────────

export const SUPPORT_FAQS: SupportFAQ[] = [
  {
    id: 'faq-1',
    categoryId: 'find-and-fund',
    question: 'How do I transition a Prospect Property to "Under Contract"?',
    answer: 'Once an Offer Letter is marked as "Accepted" and the Earnest Money Deposit (EMD) is logged in the Negotiation Ledger, the system will unlock the Phase Transition button to move the deal to Phase 2: Acquisition.',
  },
  {
    id: 'faq-2',
    categoryId: 'financials',
    question: 'Where do I upload the Closing Disclosure (CD) or HUD-1?',
    answer: 'Navigate to the Engine Room -> Financial Statements tab. Under the Settlement Documents section, you can securely upload the Closing Disclosure, which will automatically extract key cost basis data.',
  },
  {
    id: 'faq-3',
    categoryId: 'compliance',
    question: 'Can I restrict an Accountant from seeing the guest investor roster?',
    answer: 'Yes. PaperWorking uses Role-Linked access. A user assigned the "Accountant" project role has read access to the Cost Basis Ledger and Settlement items, but cannot view individual fractional investor pledges.',
  },
  {
    id: 'faq-4',
    categoryId: 'rehab',
    question: 'How does the General Contractor submit a milestone for payment?',
    answer: 'The GC can log into the Field Manager portal, mark a Rehab Task as "Complete," and upload the required "After" photo and invoice. This triggers a Pending Receipt review for the Admin or Lead Investor.',
  },
  {
    id: 'faq-5',
    categoryId: 'exit',
    question: 'How is Capital Gains Tax estimated on the Exit Dashboard?',
    answer: 'The net proceeds calculator determines if the holding period meets the Short-Term or Long-Term threshold. It then applies your configured Marginal Tax Bracket against the realized Net Profit (Sale Price minus Cost Basis and Exit Costs).',
  },
];
