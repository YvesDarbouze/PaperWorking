// ═══════════════════════════════════════════════════════
//  PaperWorking — Expanded FAQ Data
//  Organized by category for the dedicated /support/faq page
// ═══════════════════════════════════════════════════════

export interface FAQItem {
  question: string;
  answer: string;
  category: FAQCategory;
}

export type FAQCategory =
  | 'getting-started'
  | 'acquisition'
  | 'purchase'
  | 'hold-rehab'
  | 'exit'
  | 'financials'
  | 'billing'
  | 'security'
  | 'vendors';

export const FAQ_CATEGORIES: { id: FAQCategory; label: string }[] = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'acquisition', label: 'Phase 1: Acquisition' },
  { id: 'purchase', label: 'Phase 2: Purchase' },
  { id: 'hold-rehab', label: 'Phase 3: Hold & Rehab' },
  { id: 'exit', label: 'Phase 4: Exit' },
  { id: 'financials', label: 'Financial Reporting' },
  { id: 'billing', label: 'Billing & Plans' },
  { id: 'security', label: 'Security & Permissions' },
  { id: 'vendors', label: 'Vendor Portal' },
];

export const FAQ_ITEMS: FAQItem[] = [
  // ── Getting Started ──
  {
    question: 'What is PaperWorking?',
    answer: 'PaperWorking is an end-to-end real estate investment operating system. It manages every phase of the deal lifecycle — Acquisition, Purchase, Hold, and Exit — with institutional-grade precision, helping investors reduce risk and close faster.',
    category: 'getting-started',
  },
  {
    question: 'How do I create my first project?',
    answer: 'From the Dashboard Home, click the "Create Project" button. The conversational wizard will guide you through naming your deal, selecting the initial phase, and setting up your capital stack. Your project will appear in both the Command Center and Deep Focus views.',
    category: 'getting-started',
  },
  {
    question: 'What is the difference between Home, Command Center, and Deep Focus views?',
    answer: 'Home is your dashboard overview with KPIs and alerts. Command Center displays all seven deal lifecycle panels in a horizontal scroll for full visibility. Deep Focus is a Kanban-style board optimized for focused project management on individual deals.',
    category: 'getting-started',
  },
  {
    question: 'Can I invite team members to my account?',
    answer: 'Yes. Navigate to Dashboard → Team to invite collaborators. You can assign roles such as Admin, Lead Investor, Accountant, or Contractor. Each role has specific permissions controlling what data they can view and edit.',
    category: 'getting-started',
  },
  {
    question: 'What file types can I upload to the Document Vault?',
    answer: 'The Document Vault supports PDF, DOCX, XLSX, PNG, JPG, and CSV files. All uploads are encrypted at rest and in transit. You can assign strict vendor-level access controls to each file.',
    category: 'getting-started',
  },
  // ── Phase 1: Acquisition ──
  {
    question: 'How do I generate a Letter of Intent (LOI)?',
    answer: 'In the Acquisition Panel, select a prospect property and click "Generate LOI." The system pulls data from your underwriting model to create a formal, trackable LOI. Syndication partners receive a secure link through the Guest Portal to review and e-sign.',
    category: 'acquisition',
  },
  {
    question: 'How do I transition a property from Prospect to Under Contract?',
    answer: 'Once an Offer Letter is marked "Accepted" and the Earnest Money Deposit (EMD) is logged in the Negotiation Ledger, the Phase Transition button unlocks. Click it to move the deal to Phase 2: Purchase.',
    category: 'acquisition',
  },
  {
    question: 'How does the Capital Syndicate feature work?',
    answer: 'Create a Capital Syndicate room from the Acquisition Panel to invite investors and collect soft commitments (Funding Pledges). Once you have enough committed capital, convert those pledges into formal LOIs with one click.',
    category: 'acquisition',
  },
  {
    question: 'Can I track off-market deals?',
    answer: 'Yes. The Deal Pipeline panel supports off-market leads. Add properties manually, tag their source (direct mail, wholesaler, networking), and track them through your full acquisition funnel.',
    category: 'acquisition',
  },
  {
    question: 'What is the 70% Rule Tracker?',
    answer: 'A built-in calculator that applies the fix-and-flip guideline: Maximum Purchase Price = (ARV × 0.70) – Repair Costs. It helps you quickly assess whether a deal meets your investment criteria.',
    category: 'acquisition',
  },
  // ── Phase 2: Purchase ──
  {
    question: 'How does the Contingency Tracker work?',
    answer: 'The Contingency Tracker monitors your inspection, financing, and appraisal deadlines during due diligence. It sends automated alerts before each deadline so you never risk losing your EMD by missing a contingency window.',
    category: 'purchase',
  },
  {
    question: 'Where do I upload the Closing Disclosure (CD) or HUD-1?',
    answer: 'Navigate to the Engine Room → Financial Statements tab. Under Settlement Documents, upload the Closing Disclosure. The system automatically extracts key cost basis data including purchase price, closing costs, and prorations.',
    category: 'purchase',
  },
  {
    question: 'How do I manage title search documents?',
    answer: 'In the Purchase Panel, use the Title & Chain of Title section to upload title commitments, note any exceptions, and track resolution status. All documents are stored in the Document Vault with version history.',
    category: 'purchase',
  },
  {
    question: 'Can I track multiple loan options simultaneously?',
    answer: 'Yes. The Capital & Evaluation panel allows you to input and compare multiple loan term sheets side by side, including interest rates, points, origination fees, and LTV ratios to find the best financing option.',
    category: 'purchase',
  },
  // ── Phase 3: Hold & Rehab ──
  {
    question: 'How does a General Contractor submit a milestone for payment?',
    answer: 'The GC logs into the Field Manager portal, marks a Rehab Task as "Complete," and uploads the required "After" photo and invoice. This triggers a Pending Receipt review for the Admin or Lead Investor to approve the draw.',
    category: 'hold-rehab',
  },
  {
    question: 'How are holding costs tracked?',
    answer: 'The holding cost clock starts automatically upon acquisition. Set up recurring monthly ledgers for property taxes, insurance, utilities, and HOA fees in the Hold Panel. These costs feed directly into your burn rate and cost basis calculations.',
    category: 'hold-rehab',
  },
  {
    question: 'What is the CapEx Reconciliation workflow?',
    answer: 'CapEx tracking bridges field logistics and financing. Contractors submit receipts through the Field Manager, which are matched against the approved Scope of Work. Once verified, the system generates an Escrow Draw request for lender authorization.',
    category: 'hold-rehab',
  },
  {
    question: 'Can I track municipal permits and inspections?',
    answer: 'Yes. The Hold Panel includes a Permitting section where you log all required municipal permits, track their approval status, and schedule rough-in and final inspections to avoid costly delays.',
    category: 'hold-rehab',
  },
  // ── Phase 4: Exit ──
  {
    question: 'How is Capital Gains Tax estimated on the Exit Dashboard?',
    answer: 'The calculator determines if the holding period qualifies for short-term or long-term treatment. It then applies your configured Marginal Tax Bracket against the realized Net Profit (Sale Price minus Cost Basis and Exit Costs).',
    category: 'exit',
  },
  {
    question: 'Can I model a refinance vs. sale scenario?',
    answer: 'Yes. The Exit Hub includes a Refinance vs. Sale analysis tool that models both exit strategies side by side, comparing after-tax returns, equity retention, and monthly cash flow for rental hold scenarios.',
    category: 'exit',
  },
  {
    question: 'How do I distribute net proceeds to investors?',
    answer: 'In the Exit Hub, generate individualized K-1 data prep sheets and distribution ledgers for each investor in your syndicate. The system calculates each partner\'s share based on the operating agreement terms.',
    category: 'exit',
  },
  {
    question: 'What is the Settlement Ledger?',
    answer: 'A centralized record of all final transaction costs in the Exit Hub. It automatically calculates buyer/seller credits, prorated property taxes, utility adjustments, and agent commissions for accurate net proceeds.',
    category: 'exit',
  },
  // ── Financial Reporting ──
  {
    question: 'How do I generate a Profit & Loss (P&L) statement?',
    answer: 'Access the Engine Room and select the Financial Statements tab. Click "Generate P&L" to create a CPA-ready report for an individual property or your entire portfolio. Export as PDF or CSV.',
    category: 'financials',
  },
  {
    question: 'What is the Cost Basis Ledger?',
    answer: 'An automatically-maintained record that aggregates your acquisition costs, all capital improvements (CapEx), and holding costs from Phases 1-3 into a single, running total used for capital gains calculations at exit.',
    category: 'financials',
  },
  {
    question: 'Can I export financial data to QuickBooks?',
    answer: 'Yes. The Engine Room includes a Tax Export Integration feature that generates CSV files formatted for major accounting platforms including QuickBooks, Xero, and FreshBooks.',
    category: 'financials',
  },
  {
    question: 'How does bank feed reconciliation work?',
    answer: 'Connect your bank accounts in the Engine Room to automatically match platform-logged expenses with actual bank transactions. The reconciliation tool highlights discrepancies for quick resolution.',
    category: 'financials',
  },
  // ── Billing & Plans ──
  {
    question: 'What plans are available?',
    answer: 'PaperWorking offers three tiers: Individual (solo investors), Team (small partnerships), and Vendor (marketplace access for contractors and service providers). Every plan includes a 14-day free trial with full access.',
    category: 'billing',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time from Dashboard → Settings → Billing. Changes take effect at the start of your next billing cycle. No penalties.',
    category: 'billing',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card is required to start your trial.',
    category: 'billing',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through our secure Stripe integration. Annual billing is available at a discounted rate.',
    category: 'billing',
  },
  // ── Security & Permissions ──
  {
    question: 'Can I restrict an Accountant from seeing investor data?',
    answer: 'Yes. PaperWorking uses Role-Based Access Control (RBAC). Users with the "Accountant" role have read access to the Cost Basis Ledger and settlement items but cannot view individual investor pledges or syndicate details.',
    category: 'security',
  },
  {
    question: 'How is my data protected?',
    answer: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use Firebase Authentication with support for email/password, Google, and Facebook sign-in. Session tokens are rotated automatically.',
    category: 'security',
  },
  {
    question: 'What user roles are available?',
    answer: 'PaperWorking supports five roles: Admin (full access), Lead Investor (deal management), Accountant (financial data only), Contractor (scope of work and milestones), and Guest (read-only document access via Guest Portal).',
    category: 'security',
  },
  // ── Vendor Portal ──
  {
    question: 'How do vendors submit bids?',
    answer: 'Approved vendors access the Vendor Portal to view posted Scopes of Work and submit competitive bids. Deal Admins can compare bids side by side and award work directly through the platform.',
    category: 'vendors',
  },
  {
    question: 'What documents do vendors need to upload?',
    answer: 'Vendors must provide a W-9, Certificate of Insurance (COI), and signed Lien Waivers before receiving any draw payments. All documents are tracked in the compliance section of the Vendor Portal.',
    category: 'vendors',
  },
  {
    question: 'How does the milestone payment system work?',
    answer: 'Payments are tied to verified milestones defined in the Scope of Work. When a contractor marks a task as complete and uploads proof (photos + invoice), the Admin reviews and approves the payment, which triggers an Escrow Draw request if applicable.',
    category: 'vendors',
  },
];
