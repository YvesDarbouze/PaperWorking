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
  | 'vendors'
  | 'industry-data';

export const FAQ_CATEGORIES: { id: FAQCategory; label: string }[] = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'acquisition', label: 'Phase 1: Acquisition' },
  { id: 'purchase', label: 'Phase 2: Fund' },
  { id: 'hold-rehab', label: 'Phase 3: Hold' },
  { id: 'exit', label: 'Phase 4: Exit' },
  { id: 'financials', label: 'Financial Reporting' },
  { id: 'billing', label: 'Billing & Plans' },
  { id: 'security', label: 'Security & Permissions' },
  { id: 'vendors', label: 'Vendor Portal' },
  { id: 'industry-data', label: 'Industry Insights' },
];

export const FAQ_ITEMS: FAQItem[] = [
  // ── Getting Started ──
  {
    question: 'What is PaperWorking?',
    answer: 'PaperWorking is an operating system for real estate investors. It covers every phase of the deal lifecycle — Acquisition, Fund, Hold, and Exit — with every dollar tracked from day one. Less risk, faster closings, numbers you can actually trust.',
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
    answer: 'Yes. Go to Dashboard → Team and invite collaborators by email. Assign roles — Admin, Lead Investor, Accountant, or Contractor — and each person only sees what their role allows.',
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
    answer: 'Once an Offer Letter is marked "Accepted" and the Earnest Money Deposit (EMD) is logged in the Negotiation Ledger, the Phase Transition button unlocks. Click it to move the deal to Phase 2: Fund.',
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
  // ── Phase 2: Fund ──
  {
    question: 'How does the Contingency Tracker work?',
    answer: 'The Contingency Tracker monitors your inspection, financing, and appraisal deadlines during due diligence. It sends automated alerts before each deadline so you never risk losing your EMD by missing a contingency window.',
    category: 'purchase',
  },
  {
    question: 'Where do I upload the Closing Disclosure (CD) or HUD-1?',
    answer: 'Open the Engine Room → Financial Statements tab. Under Settlement Documents, upload the Closing Disclosure. The system pulls the key cost basis data automatically — purchase price, closing costs, and prorations.',
    category: 'purchase',
  },
  {
    question: 'How do I manage title search documents?',
    answer: 'In the Fund Panel, use the Title & Chain of Title section to upload title commitments, note any exceptions, and track resolution status. All documents are stored in the Document Vault with version history.',
    category: 'purchase',
  },
  {
    question: 'Can I track multiple loan options simultaneously?',
    answer: 'Yes. The Capital & Evaluation panel allows you to input and compare multiple loan term sheets side by side, including interest rates, points, origination fees, and LTV ratios to find the best financing option.',
    category: 'purchase',
  },
  // ── Phase 3: Hold ──
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
    answer: 'Yes. Every plan includes a 14-day free trial with full access to all features. A credit card is collected at checkout, but you won\'t be charged until your trial ends.',
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
  // ── Industry Insights & Data (ATTOM Q2 2024) ──
  {
    question: "What's a realistic ROI to expect on a house flip right now?",
    answer: "The current national average is 30.4% gross ROI on a typical flip, per ATTOM's Q2 2024 data. That's down from the 40%+ ROIs of the 2020 market but still strong relative to most other asset classes. Be cautious of guides that promise 50%+ — those numbers usually exclude holding costs, financing carry, and the long tail of \"small\" expenses that quietly erode margins. A more conservative 10–20% net is what most working flippers actually clear once everything is accounted for. PaperWorking's Exit Formula calculator pulls every cost from acquisition through close, so the ROI you see modeled is the ROI you actually realize.",
    category: 'industry-data',
  },
  {
    question: 'How long does a typical flip take from acquisition to sale?',
    answer: "166 days — roughly 5.5 months from purchase to closing — is the national average as of Q2 2024. That's two days longer than Q1 but a meaningful improvement on 2023's 178-day average. Every extra week on market eats into your margin through insurance, utilities, taxes, and debt service. PaperWorking's Holding Cost Clock tracks daily burn against your original projection in real time, so you know exactly what a delay is costing you before the deal is underwater.",
    category: 'industry-data',
  },
  {
    question: 'How much does the average flipper actually make per year?',
    answer: "The most credible industry estimate puts the average full-time flipper at around $117,000 in annual income, though the spread across operators is enormous. What you earn comes down to flip volume (one deal a year vs. five), local market dynamics, acquisition discipline, and how tightly you control rehab budgets. The flippers who clear the upper end of that range almost universally run their deals like a business — pipeline tracked, expenses categorized, exits modeled before they close on the buy.",
    category: 'industry-data',
  },
  {
    question: 'Is house flipping still profitable in 2024?',
    answer: 'Yes, and the trend is improving. Q2 2024 gross profits hit roughly $73,500 per flip nationally — the strongest number in two years, after the 2022–2023 margin compression. Profits dipped to $65,000 in 2021, sat at $67,900 in 2022, and bottomed at $66,000 in 2023 before recovering. The market now favors operators who can move quickly and price accurately; sloppy underwriting and slow closings get punished harder than they did three years ago. Discipline beats speculation in this market.',
    category: 'industry-data',
  },
  {
    question: 'What percentage of flips actually lose money?',
    answer: "Around 12% of flips sell at break-even or a loss before all expenses are factored in, per the most-cited industry data. The real failure rate is likely higher once you include opportunity cost and unaccounted holding expenses. The most common culprits: underestimated rehab scope, missed contingency deadlines, and properties sitting too long on market. PaperWorking's Compliance Vault flags contingency dates before they expire, and the Rehab Budget Manager tracks variance against original scope in real time — the two failure modes most responsible for flips going underwater.",
    category: 'industry-data',
  },
  {
    question: 'Should I finance my flips or pay cash?',
    answer: "Nationally, 63% of flips are now paid in cash and 37% are financed — cash has trended up about three percentage points year-over-year. Cash closes faster, wins more competitive bids, and removes interest carry from your daily holding costs. Financing preserves capital for running multiple deals in parallel and accelerates scaling, but adds debt service to your monthly burn. The right answer depends on deal flow and your leverage tolerance. PaperWorking's Find & Fund Pipeline tracks capital commitments from your syndicate so you always know what's available to deploy across deals in progress.",
    category: 'industry-data',
  },
  {
    question: 'Which markets have the most flip activity right now?',
    answer: 'The highest flip rates cluster in the Southeast and Rust Belt. Warner Robins, Georgia leads the country at 20.7% of all home sales, followed by Macon (15.4%), Atlanta (13.4%), Columbus, GA (13.2%), Memphis (12.8%), Birmingham (11.7%), Cleveland (11%), and Columbus, OH (10.7%). The lowest activity is on the West Coast and Hawaii — Portland (4.2%), San Jose (4.1%), Seattle (4%), Honolulu (3.5%), and Hilo (3.3%) all under 5%. High flip-rate markets typically mean more inventory but more competition; low-activity markets often translate to longer holding periods, which matters for your carrying costs.',
    category: 'industry-data',
  },
  {
    question: 'How big is the flipping market overall?',
    answer: 'Between 241,000 and 407,000 single-family homes and condos have been flipped annually in the U.S. over the past five years. 2022 was the recent peak at 407,417 properties — the highest volume since 2005. 2023 cooled to 308,922. Q1 2024 came in at 67,817 properties and Q2 at 79,540, suggesting the market is finding its footing after the post-pandemic correction.',
    category: 'industry-data',
  },
  {
    question: 'What does it cost to flip a condo versus a single-family home?',
    answer: "Most published data blends single-family and condo flips, so condo-specific numbers require some triangulation. Combining ATTOM's average flip margin of 27.5% with the 2023 average condo sale price of $348,300 puts the typical all-in cost of a condo flip around $252,500, with roughly $95,800 in gross profit. Condos add wrinkles single-families don't: HOA dues during the hold period, restrictions on exterior work, and special-assessment exposure. Model these explicitly in your acquisition analysis rather than assuming a condo flip behaves like a house flip with a smaller footprint.",
    category: 'industry-data',
  },
  {
    question: 'What are the biggest reasons flips fail?',
    answer: "The recurring failure modes across the industry are consistent: capital that's too expensive (high-rate hard money eating the margin), rehab scope that expands past the original budget, properties that sit too long because they were priced wrong at listing, and missed contingency deadlines on the contract side that force a forced sale or earnest money loss. Each of these is preventable with disciplined tracking. The reason PaperWorking is built around four phases (acquisition, purchase, hold, exit) rather than as a generic project tool is that each phase has its own failure mode, and the answers live in different places — capital stack data, document deadlines, daily burn rate, and final reconciliation. Mixing them in spreadsheets is how flips quietly lose money.",
    category: 'industry-data',
  },
];
