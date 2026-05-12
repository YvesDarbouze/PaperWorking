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
  // Platform Basics — Getting Started guides
  {
    id: 'account-setup',
    categoryId: 'find-and-fund',
    title: 'Account Setup & Team Invites',
    excerpt: 'Create your workspace, configure admin roles, and invite deal leaders with the right permissions from day one.',
    readTime: '4 min',
    content: '<p>Your PaperWorking workspace is the command center for every deal in your portfolio. Setting it up correctly from the start saves hours of cleanup later.</p><h3>Creating Your Workspace</h3><p>After signing up, you\'ll land on the Dashboard. Your first step is to complete your <strong>Organization Profile</strong> — business name, entity type, and primary contact. This information appears on generated documents, so get it right the first time.</p><h3>Inviting Team Members</h3><p>From the <strong>Team Directory</strong>, click <strong>Invite Member</strong>. Enter their email and assign a role:</p><ul><li><strong>Admin / Lead Investor</strong> — Full access to all deal data, team management, and billing.</li><li><strong>Deal Lead</strong> — Full access to assigned deals, no access to billing or team management.</li><li><strong>Accountant</strong> — Read access to financials only. Cannot view investor rosters or manage team members.</li><li><strong>Contractor</strong> — Access limited to assigned scopes of work, milestone submissions, and draw requests.</li></ul><h3>Security Permissions</h3><p>Each role has pre-configured permission boundaries. You can\'t accidentally give a contractor access to your P&L, and your accountant can\'t see individual investor pledges. The system enforces separation by design.</p><h3>Multi-Factor Authentication</h3><p>Enable MFA for all admin accounts. Go to <strong>Settings → Security</strong> and toggle on two-factor authentication. We support authenticator apps and SMS verification.</p>',
  },
  {
    id: 'wiring-first-deal',
    categoryId: 'find-and-fund',
    title: 'Wiring Your First Deal',
    excerpt: 'Initialize Phase 1: Acquisition — structure your capital stack, set underwriting criteria, and create your first project.',
    readTime: '5 min',
    content: '<p>Every investment in PaperWorking starts as a <strong>Project</strong>. Creating one initializes the 4-Phase lifecycle and gives you a structured workspace for every document, transaction, and decision from acquisition through exit.</p><h3>Creating a New Project</h3><p>From the Dashboard, click <strong>New Project</strong>. Enter the property address — the platform auto-populates county records, tax data, and zoning information where available. Give the project a name your team will recognize.</p><h3>Setting Up the Capital Stack</h3><p>Open the <strong>Capital Stack</strong> tab. Define your financing structure: equity contribution, hard money or bridge loan terms, and any syndication capital. Every dollar you plan to deploy should be accounted for here — it feeds every downstream calculation.</p><h3>Configuring Underwriting Criteria</h3><p>Set your deal-specific targets: Maximum Allowable Offer (MAO), target Cash-on-Cash return, and acceptable Cap Rate range. The platform flags metrics that fall outside your thresholds as you refine the deal.</p><h3>Phase 1: Acquisition Workflow</h3><p>With the project created, you\'re in Phase 1. This is where you track prospects, run underwriting models, craft offer letters, and manage your LOI pipeline. When the offer is accepted and your EMD is logged, the system unlocks the transition to Phase 2: Purchase.</p>',
  },
  {
    id: 'digital-document-vault',
    categoryId: 'compliance',
    title: 'The Digital Document Vault',
    excerpt: 'Securely upload, organize, and share deal documents with strict role-based vendor access controls.',
    readTime: '4 min',
    content: '<p>Every real estate deal generates a mountain of paperwork. The Document Vault gives you a secure, organized repository for every contract, receipt, inspection report, and closing document — accessible only to the people who need them.</p><h3>Uploading Documents</h3><p>Drag and drop files directly into the Vault from any deal workspace. The platform accepts PDFs, images, spreadsheets, and common document formats. Each upload is tagged with the deal name, phase, and document type automatically.</p><h3>Folder Structure</h3><p>Documents are organized by deal phase: Acquisition, Purchase, Hold, and Exit. Within each phase, files are grouped by type — contracts, financial records, inspection reports, and compliance documents. You can add custom folders for deal-specific needs.</p><h3>Role-Based Access</h3><p>This is where the Vault earns its name. Access to documents is controlled by the viewer\'s role:</p><ul><li><strong>Contractors</strong> see only their assigned scope of work and milestone documents.</li><li><strong>Accountants</strong> see financial records and settlement documents, but not investor communications.</li><li><strong>Investors</strong> see deal summaries and their own commitment documents through the Guest Portal.</li><li><strong>Admins</strong> see everything.</li></ul><h3>Version Control</h3><p>Upload a revised document and the Vault preserves the previous version. You can always see who uploaded what and when — creating an audit trail that protects you during disputes or compliance reviews.</p><h3>Sharing with External Parties</h3><p>Generate secure, time-limited share links for attorneys, title companies, or lenders. Each link logs when the recipient accessed the document and from where.</p>',
  },

  // Phase 1: Acquisition (find-and-fund)
  {
    id: 'generating-an-loi',
    categoryId: 'find-and-fund',
    title: 'Generate LOIs Without the Legal Chaos',
    excerpt: 'Turn soft capital commitments into formal Letters of Intent in one click. No more chasing investors through email threads.',
    readTime: '4 min',
    content: '<p>You\'ve got the deal, and you\'ve got the soft commitments. But chasing down investors to sign formal Letters of Intent (LOIs) usually means drowning in email threads and confusing PDFs.</p><p>With PaperWorking, you can convert those early Funding Pledges into formal, trackable LOIs instantly. Your syndication partners receive a clean, secure link through the Guest Portal to review and sign—so you can lock in your capital faster and move to close.</p>',
  },
  {
    id: 'underwriting-criteria',
    categoryId: 'find-and-fund',
    title: 'Underwriting & Deal Analysis Criteria',
    excerpt: 'Set up your deal criteria — cash flow, ROI, risk profiles — before you make an offer.',
    readTime: '5 min',
    content: '<p>Good underwriting is the difference between a profitable deal and an expensive lesson. Before you submit an offer, you need hard numbers — not gut feelings.</p><h3>Setting Your Baseline Metrics</h3><p>Open your Deal workspace and pull up the <strong>Underwriting Calculator</strong>. Enter your target acquisition price, estimated renovation budget, and projected After-Repair Value (ARV). The platform runs your Maximum Allowable Offer (MAO) using the 70% rule as a starting point.</p><h3>Key Metrics to Configure</h3><ul><li><strong>Cash-on-Cash Return</strong> — Your annual pre-tax cash flow divided by total cash invested. Most experienced investors target 8–12% minimum.</li><li><strong>Cap Rate</strong> — Net Operating Income divided by purchase price. Useful for comparing rental hold deals across different markets.</li><li><strong>Internal Rate of Return (IRR)</strong> — Accounts for the time value of money across your entire hold period. This is the metric your LPs care about most.</li></ul><h3>Risk Scoring</h3><p>PaperWorking flags deals that exceed your configured risk thresholds — renovation scope, market volatility, financing terms — before you commit capital. You see the red flags before the wire hits.</p>',
  },
  {
    id: 'sourcing-off-market',
    categoryId: 'find-and-fund',
    title: 'Sourcing Off-Market Deals',
    excerpt: 'How to track and manage off-market property leads so nothing falls through the cracks.',
    readTime: '6 min',
    content: '<p>The best deals rarely hit the MLS. Managing your pipeline of off-market properties requires discipline — and a system that doesn\'t let leads slip through the cracks.</p><h3>The Prospect Tracker</h3><p>Every potential deal starts as a <strong>Prospect</strong> in your pipeline. Add properties manually or import them from your lead sources. Each prospect card captures the essentials: address, owner info, estimated ARV, and your initial notes.</p><h3>Tracking Lead Sources</h3><p>Tag each prospect with its origin — direct mail, driving for dollars, wholesaler, or referral. Over time, the platform shows you which sources produce the highest-quality deals so you can double down on what works.</p><h3>Moving Prospects Forward</h3><p>When a prospect is worth pursuing, promote it to <strong>Active Analysis</strong>. This unlocks the underwriting calculator and creates a dedicated document folder. If the numbers work, convert it to a full Deal and enter Phase 1.</p><p>Prospects that don\'t make the cut stay in your archive — searchable and ready if market conditions change.</p>',
  },
  {
    id: 'initializing-syndicate',
    categoryId: 'find-and-fund',
    title: 'Initializing a Capital Syndicate',
    excerpt: 'How to invite investors and collect soft commitments for your next real estate project.',
    readTime: '7 min',
    content: '<p>When a deal passes underwriting, the next step is securing capital. PaperWorking\'s Syndicate Room lets you organize investors, collect soft commitments, and track your capital stack — all before you go hard on the contract.</p><h3>Creating the Syndicate Room</h3><p>From your Deal workspace, click <strong>Initialize Syndicate</strong>. This creates a secure, role-controlled space where your Limited Partners (LPs) can review the deal summary, projected returns, and your track record.</p><h3>Inviting Investors</h3><p>Add investors by email. Each receives a secure Guest Portal link — no account required. They can review your offering materials, ask questions through the built-in message thread, and submit a <strong>Funding Pledge</strong> indicating their intended contribution.</p><h3>Tracking the Capital Stack</h3><p>The Syndicate Dashboard shows your funding progress in real time: total committed, remaining gap, and each investor\'s pledge status. You\'ll know exactly when you\'ve hit your raise target.</p><h3>Converting Pledges to LOIs</h3><p>Once you have enough soft commitments, convert them to formal Letters of Intent with one click. Investors receive the LOI through the Guest Portal for e-signature — no email attachments, no version confusion.</p><p>When your LOIs are signed and your capital is committed, you\'re ready to move the deal into Phase 2: Purchase.</p>',
  },
  {
    id: 'crafting-offer-letter',
    categoryId: 'find-and-fund',
    title: 'Crafting the Perfect Offer Letter',
    excerpt: 'Use the built-in templates to submit strong, contingency-aware offers to sellers.',
    readTime: '4 min',
    content: '<p>A strong offer letter bridges the gap between your analysis and the seller\'s expectations. PaperWorking\'s Offer Generation tool pulls directly from your underwriting model so your numbers are always consistent.</p><h3>Building the Offer</h3><p>Open the <strong>Offer Builder</strong> from your Deal workspace. The purchase price, earnest money deposit (EMD), and contingency periods auto-populate from your underwriting inputs. Adjust as needed for the specific negotiation.</p><h3>Contingency Configuration</h3><p>Set your inspection, financing, and appraisal contingency windows. The platform tracks these deadlines from the moment the offer is accepted — so you never accidentally waive a protection by missing a date.</p><h3>Submitting the Offer</h3><p>Export a clean PDF or share directly through the platform. Once the seller accepts, mark the offer as <strong>Accepted</strong> to unlock Phase 2 and start your due diligence clock.</p>',
  },

  // Phase 2: Purchase (acquisition)
  {
    id: 'managing-contingency-deadlines',
    categoryId: 'acquisition',
    title: 'Managing Due Diligence Contingency Deadlines',
    excerpt: 'Set up alerts for Inspection, Financing, and Appraisal contingencies so you never risk your EMD.',
    readTime: '3 min',
    content: '<p>Missing a contingency deadline can put your Earnest Money Deposit at risk — and that\'s money you don\'t get back. The Contingency Tracker keeps every critical date visible from the moment your offer is accepted.</p><h3>How It Works</h3><p>When you move a deal into Phase 2, the platform creates deadline cards for your three standard contingencies: <strong>Inspection</strong>, <strong>Financing</strong>, and <strong>Appraisal</strong>. Each card counts down to its expiration date.</p><h3>Setting Up Alerts</h3><p>Set push notifications and email reminders at 7-day, 3-day, and 1-day intervals. Your team members and assigned attorney get reminders too — so no one is caught off guard.</p><h3>Extending or Waiving</h3><p>If you need more time, log the extension directly in the tracker with the seller\'s acknowledgment date. If you choose to waive a contingency, the platform records it with a timestamp so your decision trail is always clear.</p>',
  },
  {
    id: 'title-search-basics',
    categoryId: 'acquisition',
    title: 'Title Search & Chain of Title Basics',
    excerpt: 'What to look for when reviewing title commitments and ensuring a clean transfer of ownership.',
    readTime: '5 min',
    content: '<p>A clean title is the single most important prerequisite for a successful closing. If there are liens, encumbrances, or breaks in the chain of ownership, your deal can stall — or collapse entirely.</p><h3>Reviewing the Title Commitment</h3><p>When your title company delivers the commitment, upload it to the <strong>Document Vault</strong> in your Phase 2 workspace. PaperWorking highlights the key sections: Schedule A (property description and proposed insured), Schedule B-I (requirements to close), and Schedule B-II (exceptions to coverage).</p><h3>What to Watch For</h3><ul><li><strong>Outstanding liens</strong> — Tax liens, mechanic\'s liens, or judgment liens must be cleared before transfer.</li><li><strong>Easements</strong> — Utility or access easements that could limit your renovation or development plans.</li><li><strong>HOA obligations</strong> — Unpaid assessments that transfer to the buyer at closing.</li></ul><h3>Documenting Exceptions</h3><p>Log each exception with a resolution status: cleared, pending, or accepted. Your closing attorney can review the log directly through their role-based portal access.</p>',
  },
  {
    id: 'coordinating-inspections',
    categoryId: 'acquisition',
    title: 'Coordinating Appraisals & Inspections',
    excerpt: 'Schedule and track third-party reports required by your lender during the purchase phase.',
    readTime: '4 min',
    content: '<p>Your lender will require multiple third-party reports before funding — and delays here delay your closing. Use the <strong>Task Manager</strong> in Phase 2 to schedule, track, and store every report.</p><h3>Scheduling Inspections</h3><p>Create tasks for each required report: general home inspection, pest/termite, radon, structural, and any specialty inspections. Assign due dates based on your contingency windows.</p><h3>Appraisal Management</h3><p>When the lender orders the appraisal, log the appraiser\'s contact info and scheduled date. If the appraisal comes in low, the platform surfaces your options: renegotiate the price, bring additional cash, or exercise your appraisal contingency.</p><h3>Storing Reports</h3><p>Upload each completed report to the Document Vault. They\'re automatically organized by type and linked to the deal — so when you need them at closing, they\'re already filed.</p>',
  },
  {
    id: 'securing-bridge-loans',
    categoryId: 'acquisition',
    title: 'Securing Hard Money or Bridge Loans',
    excerpt: 'Manage loan term sheets, points, and origination fees within your capital stack.',
    readTime: '6 min',
    content: '<p>Accurate loan data is the backbone of your financial projections. When you input your financing terms during Phase 2, every downstream calculation — burn rate, holding costs, and exit ROI — depends on these numbers being right.</p><h3>Entering Loan Terms</h3><p>Open the <strong>Capital Stack</strong> section of your deal. Add your financing source and enter the key terms: loan amount, interest rate, origination points, and draw schedule. PaperWorking supports fixed-rate, interest-only, and adjustable structures.</p><h3>Points and Fees</h3><p>Log origination fees, processing fees, and any broker compensation. These roll into your cost basis automatically and appear on your Profit & Loss statement.</p><h3>Draw Schedules</h3><p>For renovation loans with staged draws, configure the draw schedule here. The platform tracks each draw request against the total approved amount, so you always know how much capital remains available.</p>',
  },
  {
    id: 'closing-document-checklist',
    categoryId: 'acquisition',
    title: 'Closing Document Checklist',
    excerpt: 'The checklist that catches missing signatures before they delay your closing.',
    readTime: '4 min',
    content: '<p>A missed signature can delay your closing by days — or kill the deal entirely. The Phase 2 Closing Checklist accounts for every document before you wire funds.</p><h3>The Standard Checklist</h3><p>PaperWorking pre-populates a checklist with the documents most closings require:</p><ul><li><strong>Deed</strong> — Warranty deed or special warranty deed, fully executed.</li><li><strong>Closing Disclosure / HUD-1</strong> — Final settlement statement with all prorated costs.</li><li><strong>Operating Agreement</strong> — If purchasing through an LLC, your entity docs must be on file.</li><li><strong>Title Insurance Policy</strong> — Owner\'s and lender\'s policies confirmed.</li><li><strong>Proof of Insurance</strong> — Hazard insurance binder effective on the closing date.</li></ul><h3>Custom Items</h3><p>Add deal-specific items: seller concessions, repair credits, or assignment of contracts. Each item can be marked as received, pending, or missing — with the responsible party tagged.</p><h3>Closing Day</h3><p>On closing day, run through the checklist one final time. When every item is green, mark the deal as <strong>Closed</strong> to transition into Phase 3: Hold.</p>',
  },

  // Phase 3: Hold (rehab)
  {
    id: 'tracking-holding-costs',
    categoryId: 'rehab',
    title: 'Tracking Holding Costs During Renovation',
    excerpt: 'Set up recurring ledgers for taxes, insurance, utilities, and HOA fees so your burn rate stays accurate.',
    readTime: '6 min',
    content: '<p>The moment you close on a property, the holding cost clock starts. Every day you own the asset before disposition, you\'re paying for it — and those costs compound faster than most investors realize.</p><h3>Automatic Cost Tracking</h3><p>PaperWorking calculates your daily burn rate from the recorded closing date. It tracks five recurring cost categories automatically: <strong>Property Taxes</strong>, <strong>Insurance</strong>, <strong>Utilities</strong>, <strong>HOA/Condo Fees</strong>, and <strong>Loan Interest</strong>.</p><h3>Setting Up Recurring Entries</h3><p>Open the <strong>Holding Costs</strong> tab in your Phase 3 workspace. Enter the monthly amount for each category. The platform prorates them daily and rolls the totals into your running cost basis.</p><h3>Why This Matters</h3><p>Most investors underestimate holding costs by 15–25%. A property that sits on the market two months longer than planned can turn a profitable flip into a break-even deal. The burn rate dashboard shows you exactly how much each additional day costs — so you can price and time your exit with confidence.</p>',
  },
  {
    id: 'capex-reconciliation',
    categoryId: 'rehab',
    title: 'CapEx Reconciliation & Escrow Draws',
    excerpt: 'How to manage the workflow between General Contractors submitting receipts and Lenders authorizing Escrow Draws.',
    readTime: '8 min',
    content: '<p>Capital Expenditure tracking in PaperWorking bridges the gap between field logistics and financing. When your General Contractor completes work and submits receipts, that data needs to flow cleanly to your lender for draw authorization.</p><h3>The CapEx Workflow</h3><ol><li><strong>GC submits a receipt</strong> — Through the Vendor Portal, your contractor uploads the invoice, completion photos, and a signed lien waiver for the completed scope.</li><li><strong>You review and approve</strong> — Compare the submission against the original Scope of Work and budget allocation. Approve, reject, or request revisions.</li><li><strong>Draw request generated</strong> — Approved receipts are bundled into a draw request package formatted for your lender\'s requirements.</li><li><strong>Lender funds the draw</strong> — Once the lender authorizes the release, log the funded amount to update your remaining renovation budget.</li></ol><h3>Budget Variance Tracking</h3><p>The platform compares actual spending against your original budget in real time. If a line item exceeds its allocation, you\'ll see a variance alert before the overrun compounds into a larger problem.</p>',
  },
  {
    id: 'contractor-bids-milestones',
    categoryId: 'rehab',
    title: 'Managing Contractor Bids & Milestones',
    excerpt: 'Compare bids, assign scopes of work, and track construction progress against your budget.',
    readTime: '5 min',
    content: '<p>Choosing the right contractor can make or break your renovation budget. The Vendor Portal in PaperWorking lets you manage the entire process — from collecting bids to tracking milestone completion.</p><h3>Collecting Bids</h3><p>Create a <strong>Scope of Work</strong> document in your Phase 3 workspace. Break it down by trade: demolition, framing, electrical, plumbing, HVAC, finishes. Share the scope with prospective contractors through the Vendor Portal — they can submit line-item bids directly.</p><h3>Comparing and Awarding</h3><p>The bid comparison view shows each contractor\'s pricing side-by-side against your budget. Award the scope to your chosen contractor and the platform generates the work agreement.</p><h3>Tracking Milestones</h3><p>Define milestones tied to payment: rough-in complete, drywall hung, finishes installed. Contractors mark milestones as complete and upload progress photos. You approve each milestone before releasing payment — keeping your cash flow tied to actual progress.</p>',
  },
  {
    id: 'permitting-signoffs',
    categoryId: 'rehab',
    title: 'Permitting and Inspection Sign-offs',
    excerpt: 'Track local permits and make sure rough-in and final inspections pass on time.',
    readTime: '4 min',
    content: '<p>Municipal permits are non-negotiable. Unpermitted work creates liability at sale and can void your insurance coverage. Track every permit and inspection in Phase 3 to avoid costly delays.</p><h3>Logging Permits</h3><p>Add each required permit to the <strong>Permitting Tracker</strong>: building permit, electrical, plumbing, mechanical, and any specialty permits (e.g., historic district review). Record the application date, expected approval timeline, and permit number once issued.</p><h3>Inspection Scheduling</h3><p>Most jurisdictions require multiple inspections: foundation, rough-in, and final. Create inspection tasks with the required dates and assign them to your GC. Failed inspections are logged with the reason and re-inspection date.</p><h3>Avoiding Delays</h3><p>The Permitting Tracker highlights permits that are approaching expiration or inspections that are overdue. Address these proactively — a lapsed permit can shut down your job site and add weeks to your timeline.</p>',
  },
  {
    id: 'material-procurement',
    categoryId: 'rehab',
    title: 'Material Procurement and Budget Tracking',
    excerpt: 'Log material orders, track delivery dates, and reconcile against the initial CapEx budget.',
    readTime: '5 min',
    content: '<p>Material costs are often the largest variable in a renovation budget. Tracking orders, delivery dates, and actual costs against your estimates keeps your project financially healthy.</p><h3>Logging Purchase Orders</h3><p>Enter purchase orders for major materials — cabinets, flooring, countertops, fixtures, appliances. Include the vendor, order date, expected delivery, and total cost. The platform deducts each PO from your remaining budget allocation.</p><h3>Delivery Tracking</h3><p>Mark deliveries as received and note any discrepancies: damaged goods, wrong quantities, or substitutions. This creates a documentation trail if you need to file claims or dispute charges.</p><h3>Budget Reconciliation</h3><p>The Materials Dashboard compares your budgeted allowances against actual purchase costs. If you\'re running over on finishes, you\'ll see it early enough to make trade-offs — upgrade the kitchen but spec standard fixtures in the bathrooms, for example.</p>',
  },

  // Phase 4: Exit (exit)
  {
    id: 'settlement-ledger-prorations',
    categoryId: 'exit',
    title: 'Managing the Settlement Ledger and Prorations',
    excerpt: 'Automate buyer/seller credits and calculate prorated escrow for property taxes and utilities prior to closing.',
    readTime: '5 min',
    content: '<p>The settlement ledger is where every dollar gets its final accounting. Before you close on a disposition, the ledger must reconcile buyer credits, seller credits, and prorated escrow items.</p><h3>Setting Up the Ledger</h3><p>When you enter Phase 4, PaperWorking generates a Settlement Ledger pre-populated with your known costs: outstanding loan balance, real estate commissions, transfer taxes, and title insurance. Add any deal-specific items: repair credits, seller concessions, or HOA prorations.</p><h3>Prorations</h3><p>Property taxes, utility bills, and HOA fees are prorated to the closing date. Enter the annual amounts and the platform calculates the daily rate and buyer/seller split automatically.</p><h3>Net Proceeds Preview</h3><p>The ledger dynamically calculates your estimated net proceeds as you finalize each line item. This is the number that matters — what actually lands in your account after every cost is paid.</p>',
  },
  {
    id: 'final-roi-calculation',
    categoryId: 'exit',
    title: 'Final Reconciliation & ROI Calculation',
    excerpt: 'Generate the final project report detailing exact IRR, Cash-on-Cash return, and total profit.',
    readTime: '6 min',
    content: '<p>Once all holding and exit costs are logged, the platform calculates your finalized return metrics. This is the definitive answer to the question every investor asks: did this deal make money?</p><h3>Automated Calculations</h3><p>PaperWorking aggregates every cost from Phase 1 through Phase 4 — acquisition, renovation, holding, and exit — to compute your total cost basis. Subtract that from your sale proceeds, and you have your net profit.</p><h3>Key Metrics Generated</h3><ul><li><strong>Total ROI</strong> — Net profit divided by total cash invested, expressed as a percentage.</li><li><strong>Cash-on-Cash Return</strong> — Annualized return on the equity you deployed.</li><li><strong>Internal Rate of Return (IRR)</strong> — Time-weighted return that accounts for when cash flows occurred.</li><li><strong>Profit per Day Held</strong> — Net profit divided by total days of ownership. A simple but revealing metric.</li></ul><h3>Exporting the Final Report</h3><p>Generate a one-page deal summary PDF for your records, your partners, or your CPA. The report includes a complete cost breakdown, timeline, and return analysis.</p>',
  },
  {
    id: 'refinance-vs-sale',
    categoryId: 'exit',
    title: 'Refinance vs. Sale Analysis',
    excerpt: 'Use the exit scenario modeling tool to decide between cashing out or holding as a rental.',
    readTime: '7 min',
    content: '<p>Before committing to an exit strategy, you need to model both options side by side. The Scenario Modeler in Phase 4 lets you compare selling now versus refinancing and holding as a rental.</p><h3>Sale Scenario</h3><p>Enter your estimated sale price, commission rate, and closing costs. The platform calculates your projected net proceeds, total ROI, and IRR based on your actual cost basis.</p><h3>Refinance Scenario</h3><p>Enter the refinance terms: new loan amount (based on appraised value), interest rate, and term. The platform calculates your cash-out amount, monthly debt service, and projected Cash-on-Cash return from rental income.</p><h3>Making the Decision</h3><p>The comparison dashboard shows both scenarios side by side: immediate cash profit from a sale versus long-term cash flow and equity build from a refinance. Factor in your portfolio goals, tax situation, and capital needs to make the right call for this specific deal.</p>',
  },
  {
    id: 'estimating-capital-gains',
    categoryId: 'exit',
    title: 'Estimating Capital Gains Taxes',
    excerpt: 'Understand short-term vs. long-term holding impacts on your final net proceeds.',
    readTime: '4 min',
    content: '<p>Your holding period directly impacts how much you owe in taxes. The integrated tax estimator helps you project your capital gains liability before you commit to a sale date.</p><h3>Short-Term vs. Long-Term</h3><p>Properties held for less than 12 months are taxed at your ordinary income rate (Short-Term Capital Gains). Properties held longer than 12 months qualify for the lower Long-Term Capital Gains rate — typically 15–20% depending on your bracket.</p><h3>How the Estimator Works</h3><p>Enter your entity\'s tax filing status and estimated marginal tax bracket. The platform applies the appropriate rate to your projected net profit and shows the estimated tax liability. It also shows you how many additional days you\'d need to hold to qualify for long-term treatment.</p><h3>1031 Exchange Consideration</h3><p>If you\'re considering a like-kind exchange to defer capital gains, the platform flags the 45-day identification window and 180-day closing deadline from your sale date.</p>',
  },
  {
    id: 'distributing-net-proceeds',
    categoryId: 'exit',
    title: 'Distributing Net Proceeds to Investors',
    excerpt: 'Generate distribution statements and process final payouts to your capital syndicate.',
    readTime: '5 min',
    content: '<p>When the deal is done, your investors want their money — and a clear accounting of how it was earned. PaperWorking automates the distribution process so you can close the books cleanly.</p><h3>Generating Distribution Statements</h3><p>From the Phase 4 workspace, click <strong>Generate Distributions</strong>. The platform calculates each investor\'s share based on their ownership percentage and the waterfall structure defined in your operating agreement.</p><h3>K-1 Data Preparation</h3><p>For each LP, the platform generates a K-1 prep sheet with their allocated income, expenses, and capital account changes. Share these directly through the Guest Portal — your investors can download them for their tax filings.</p><h3>Processing Payouts</h3><p>Record each distribution with the payment method, date, and amount. The platform tracks cumulative distributions against each investor\'s total commitment, so your books always balance.</p><h3>Closing the Deal</h3><p>When all distributions are complete, mark the deal as <strong>Fully Exited</strong>. The project moves to your archive — searchable, auditable, and ready if you ever need to reference it.</p>',
  },

  // Financial Reporting (financials)
  {
    id: 'generating-pl-statement',
    categoryId: 'financials',
    title: 'Generating a Profit & Loss (P&L) Statement',
    excerpt: 'Export clean, CPA-ready financial statements for individual properties or your full portfolio.',
    readTime: '3 min',
    content: '<p>Tax time shouldn\'t require digging through months of deal records. PaperWorking generates CPA-ready Profit & Loss statements pulled straight from your logged transactions.</p><h3>Generating the Report</h3><p>Open the <strong>Financial Reports</strong> section from your deal workspace. Select the reporting period and click Generate P&L. The platform compiles all revenue (sale proceeds, rental income) and expenses (acquisition costs, renovation, holding costs, exit costs) into a standard format.</p><h3>Portfolio-Level Reporting</h3><p>Generate a consolidated P&L across all active deals to see your portfolio\'s overall financial performance. Filter by date range, entity, or deal status.</p><h3>Export Options</h3><p>Download as PDF for your records or CSV for direct import into QuickBooks, Xero, or your CPA\'s preferred accounting software.</p>',
  },
  {
    id: 'cost-basis-ledger',
    categoryId: 'financials',
    title: 'Understanding the Cost Basis Ledger',
    excerpt: 'Learn how acquisition costs, CapEx, and holding costs roll up into your final cost basis.',
    readTime: '6 min',
    content: '<p>Your cost basis determines your tax liability at sale. Get it wrong, and you either overpay the IRS or trigger an audit. PaperWorking builds your cost basis continuously across all four phases.</p><h3>What Rolls Into Cost Basis</h3><ul><li><strong>Acquisition costs</strong> — Purchase price, closing costs, title insurance, attorney fees.</li><li><strong>Capital expenditures</strong> — Renovation costs that add value or extend useful life.</li><li><strong>Holding costs</strong> — Property taxes, insurance, loan interest during the hold period.</li></ul><h3>Real-Time Updates</h3><p>Every time you log an expense, the cost basis ledger updates automatically. No manual spreadsheet reconciliation required.</p><h3>Exit Impact</h3><p>When you sell, your net profit equals sale proceeds minus cost basis minus exit costs. The higher your documented cost basis, the lower your taxable gain. Accurate tracking ensures you capture every legitimate deduction.</p>',
  },
  {
    id: 'reconciling-bank-feeds',
    categoryId: 'financials',
    title: 'Reconciling Bank Feeds',
    excerpt: 'Match platform transactions with your bank accounts so your books actually reflect reality.',
    readTime: '5 min',
    content: '<p>Reconciliation catches the errors that slip through manual logging. Match platform transactions with your actual bank activity — and your books will reflect reality, not guesswork.</p><h3>How It Works</h3><p>Connect your project bank account or upload a statement CSV. The reconciliation tool displays unmatched transactions side by side: platform entries on the left, bank entries on the right.</p><h3>Matching Transactions</h3><p>Click to match corresponding entries. The platform suggests likely matches based on amount and date. Confirmed matches are marked as reconciled.</p><h3>Catching Discrepancies</h3><p>Unmatched entries highlight potential problems: expenses you forgot to log, duplicate entries, or unauthorized charges. Address each discrepancy before closing the reporting period.</p>',
  },
  {
    id: 'tax-export-integration',
    categoryId: 'financials',
    title: 'Tax Export Integration',
    excerpt: 'Export your financial data directly to popular accounting software like QuickBooks.',
    readTime: '4 min',
    content: '<p>Save hours during tax season by exporting your financial data in formats your accountant already uses. No more copying numbers from screenshots into spreadsheets.</p><h3>Supported Formats</h3><p>PaperWorking exports to CSV formatted for direct import into QuickBooks Online, QuickBooks Desktop, Xero, and FreshBooks. Each export maps your transaction categories to the corresponding chart of accounts in the target platform.</p><h3>What Gets Exported</h3><p>Choose from: full transaction ledger, P&L summary, cost basis breakdown, or settlement statement. Each export includes the deal name, date, category, amount, and any attached documentation references.</p><h3>Sharing with Your CPA</h3><p>Grant your accountant read-only access through the Team Directory, or simply download and email the export files. Either way, they get clean data instead of a shoebox of receipts.</p>',
  },
  {
    id: 'monthly-escrow-reserves',
    categoryId: 'financials',
    title: 'Setting up Monthly Escrow Reserves',
    excerpt: 'Build cash reserves for upcoming property tax and insurance bills before they\'re due.',
    readTime: '4 min',
    content: '<p>Proper reserve management prevents the cash flow crunches that force investors into bad decisions. Set up escrow reserves so you always have funds ready when the bills hit.</p><h3>Setting Up Reserves</h3><p>In the <strong>Financial Planning</strong> section, create reserve buckets for property taxes, insurance premiums, and any other predictable large expenses. Enter the annual amount and the platform calculates the monthly set-aside.</p><h3>Tracking Reserve Balances</h3><p>The dashboard shows your current reserve balance against the upcoming obligation. If you\'re falling short, you\'ll see a warning with enough lead time to adjust.</p><h3>Disbursement</h3><p>When the bill comes due, log the disbursement against the reserve. The platform reconciles the payment and resets the accumulation cycle for the next period.</p>',
  },

  // Legal & Compliance (compliance)
  {
    id: 'llc-structuring',
    categoryId: 'compliance',
    title: 'LLC Structuring & Entity Management',
    excerpt: 'Organize your Series LLCs and joint ventures for maximum liability protection.',
    readTime: '7 min',
    content: '<p>How you hold title to your properties determines your personal liability exposure. PaperWorking helps you document and manage your entity structure so you always know which LLC owns what.</p><h3>Documenting Your Structure</h3><p>In the <strong>Entity Manager</strong>, create entries for each LLC, Series LLC, or joint venture in your portfolio. Link each property to its holding entity. This mapping flows through to every financial report and tax export.</p><h3>Series LLC Support</h3><p>If you use a Series LLC structure, create the parent entity and add individual series underneath. Each series maintains its own financial records and document vault while rolling up into the parent for aggregate reporting.</p><h3>Joint Ventures</h3><p>For deals with partners, document the ownership split, management responsibilities, and capital contributions. This information feeds directly into the distribution calculator when the deal exits.</p>',
  },
  {
    id: 'role-linked-access',
    categoryId: 'compliance',
    title: 'Managing Role-Linked Access Controls',
    excerpt: 'Control exactly who sees financial data — contractors, accountants, and investors each get their lane.',
    readTime: '4 min',
    content: '<p>Not everyone on your team should see everything. Role-Based Access Control keeps contractors in their scope of work, accountants in financials, and investors in their allocation — nothing more.</p><h3>Built-In Roles</h3><ul><li><strong>Admin / Lead Investor</strong> — Full access to all deal data, team management, and billing.</li><li><strong>Deal Lead</strong> — Full access to assigned deals, no access to billing or team management.</li><li><strong>Accountant</strong> — Read access to cost basis, P&L, and settlement data. No access to investor rosters.</li><li><strong>Contractor</strong> — Access to assigned scopes of work, milestone submissions, and draw requests only.</li><li><strong>Investor (Guest)</strong> — Read access to deal summary, projected returns, and their own commitment status.</li></ul><h3>Assigning Roles</h3><p>From the Team Directory or within a specific deal, invite members by email and assign their role. Permissions take effect immediately and can be changed or revoked at any time.</p>',
  },
  {
    id: 'preparing-ppm',
    categoryId: 'compliance',
    title: 'Preparing the Private Placement Memorandum (PPM)',
    excerpt: 'Securely host and distribute SEC-compliant offering documents for your syndicate.',
    readTime: '6 min',
    content: '<p>If you\'re raising capital from passive investors, you likely need a Private Placement Memorandum. PaperWorking provides a secure environment to host, distribute, and track execution of your offering documents.</p><h3>Uploading Your PPM</h3><p>Work with your securities attorney to draft the PPM. Upload the finalized document to the <strong>Document Vault</strong> under the Compliance section. The platform stores it with version control so you can track amendments.</p><h3>Distributing to Investors</h3><p>Share the PPM through the Guest Portal. Each investor receives a secure link to review the document. The platform logs when each investor accessed the document and how long they spent reviewing it.</p><h3>E-Signature Capture</h3><p>Investors can sign the subscription agreement directly through the portal. Signed documents are stored with timestamps and IP addresses for your compliance records.</p><h3>Important Note</h3><p>PaperWorking is a document management platform, not a legal advisor. Always work with a qualified securities attorney to ensure your offering complies with SEC regulations and applicable state blue sky laws.</p>',
  },
  {
    id: 'annual-reporting',
    categoryId: 'compliance',
    title: 'Annual Reporting and Tax Filings',
    excerpt: 'Track deadlines for state franchise taxes and annual LLC reports.',
    readTime: '3 min',
    content: '<p>Every LLC and corporate entity has recurring compliance obligations. Missing a filing deadline can result in penalties, loss of good standing, or involuntary dissolution — any of which complicates your ability to transact.</p><h3>The Compliance Calendar</h3><p>PaperWorking maintains a calendar of key dates for each entity: state annual report filing deadlines, franchise tax due dates, and registered agent renewal dates. Set up reminders to ensure nothing falls through the cracks.</p><h3>Tax Filing Coordination</h3><p>Track the status of each entity\'s tax filings: federal, state, and local. Mark filings as prepared, filed, or extended. This is especially important for portfolios with entities in multiple states.</p><h3>Document Storage</h3><p>Upload filed returns, annual reports, and state correspondence to the compliance section of the Document Vault. Everything is organized by entity and year for easy retrieval during audits.</p>',
  },
  {
    id: 'vendor-insurance-liens',
    categoryId: 'compliance',
    title: 'Vendor Insurance and Lien Waivers',
    excerpt: 'Collect W-9s, Certificates of Insurance, and Lien Waivers from all contractors.',
    readTime: '5 min',
    content: '<p>Before you pay a contractor, you need three things on file: a W-9, a Certificate of Insurance, and a signed lien waiver. Skipping any of these creates real financial and legal risk.</p><h3>W-9 Collection</h3><p>Every contractor who receives more than $600 in a calendar year needs a W-9 on file for 1099 reporting. The Vendor Portal prompts contractors to upload their W-9 before they can submit their first invoice.</p><h3>Certificate of Insurance</h3><p>Require proof of General Liability and Workers\' Compensation insurance. Upload the certificate to the vendor\'s profile and set an expiration reminder so you know when coverage lapses.</p><h3>Lien Waivers</h3><p>Require <strong>unconditional lien waivers</strong> for all completed and paid work. This protects you from mechanics\' liens filed after you\'ve already paid for the work. The platform tracks waiver status for each milestone payment.</p><h3>Why This Matters</h3><p>A single missed lien waiver can result in paying for the same work twice. A lapsed insurance policy can leave you liable for job-site injuries. These documents are not paperwork for paperwork\'s sake — they protect your capital.</p>',
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
    answer: 'Go to the Engine Room → Financial Statements tab. Under Settlement Documents, upload the Closing Disclosure. The system automatically extracts the key cost basis data — purchase price, closing costs, and prorations.',
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
