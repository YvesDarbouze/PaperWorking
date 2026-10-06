import type { LegacyProjectPhase } from './types';

export interface StepInputField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
  defaultValue?: string | number;
  required?: boolean;
}

export interface ConversationalStep {
  id: string;
  stepNumber: number;
  title: string;
  conversationalQuestion: string;
  whyThisMatters: string;
  requiredDocuments: string[];
  defaultRole: string;
  actionLabel: string;
  inputs: StepInputField[];
}

export const ACQUISITION_CONVERSATIONAL_STEPS: ConversationalStep[] = [
  {
    id: 'acq-step-1-lead',
    stepNumber: 1,
    title: 'Lead Intake & Property Identification',
    conversationalQuestion: 'Where is the property located, who is the seller, and what is the asking price?',
    whyThisMatters:
      'Accurate property sourcing and seller identification establish the legal baseline for ownership verification, chain of title, and zoning conformity before allocating diligence resources.',
    requiredDocuments: ['Property Flier or OM', 'Preliminary Tax Record', 'Zoning Classification Summary'],
    defaultRole: 'Acquisitions Director',
    actionLabel: 'Save Property Profile & Continue',
    inputs: [
      {
        key: 'propertyName',
        label: 'Property Name / Label',
        type: 'text',
        placeholder: 'e.g. 1247 Elm Street Apartments',
        required: true,
      },
      {
        key: 'propertyAddress',
        label: 'Property Address',
        type: 'text',
        placeholder: 'Street address, City, State, ZIP',
        required: true,
      },
      {
        key: 'askingPrice',
        label: 'Seller Asking Price',
        type: 'currency',
        placeholder: '$485,000',
        required: true,
      },
      {
        key: 'sellerName',
        label: 'Seller Entity / Point of Contact',
        type: 'text',
        placeholder: 'e.g. Apex Property Holdings LLC',
      },
    ],
  },
  {
    id: 'acq-step-2-underwriting',
    stepNumber: 2,
    title: 'Financial Valuation & Deal Underwriting',
    conversationalQuestion: 'What are the projected rents, operating expenses, and estimated after-repair value (ARV)?',
    whyThisMatters:
      'Disciplined underwriting protects equity capital by stress-testing net operating income, exit capitalization rates, and debt service coverage ratios against current capital markets.',
    requiredDocuments: ['Pro Forma Financial Model', 'Rent Roll / Leases', 'Historical T-12 Operating Statement'],
    defaultRole: 'Lead Underwriter',
    actionLabel: 'Lock Pro Forma Valuation & Continue',
    inputs: [
      {
        key: 'estimatedArv',
        label: 'Estimated After-Repair Value (ARV)',
        type: 'currency',
        placeholder: '$620,000',
        required: true,
      },
      {
        key: 'rehabBudget',
        label: 'Estimated Rehab Budget',
        type: 'currency',
        placeholder: '$65,000',
        required: true,
      },
      {
        key: 'grossMonthlyRent',
        label: 'Gross Monthly Pro Forma Rent',
        type: 'currency',
        placeholder: '$4,200',
        required: true,
      },
      {
        key: 'operatingExpenseRatio',
        label: 'Operating Expense Ratio (%)',
        type: 'number',
        placeholder: '35',
        defaultValue: 35,
      },
    ],
  },
  {
    id: 'acq-step-3-loi',
    stepNumber: 3,
    title: 'Letter of Intent & Offer Submission',
    conversationalQuestion: 'What purchase price, earnest deposit, and inspection timeline will you offer in your Letter of Intent?',
    whyThisMatters:
      'A structured Letter of Intent (LOI) binds key business terms without premature legal liabilities, establishing exclusive negotiation rights and inspection contingency windows.',
    requiredDocuments: ['Executed Letter of Intent (LOI)', 'Proof of Funds (POF) Letter', 'Lender Prequalification Letter'],
    defaultRole: 'Acquisitions Director',
    actionLabel: 'Generate & Transmit LOI',
    inputs: [
      {
        key: 'offerPrice',
        label: 'Formal Offer Purchase Price',
        type: 'currency',
        placeholder: '$475,000',
        required: true,
      },
      {
        key: 'earnestMoneyDeposit',
        label: 'Proposed Earnest Money Deposit (EMD)',
        type: 'currency',
        placeholder: '$10,000',
        required: true,
      },
      {
        key: 'inspectionDays',
        label: 'Inspection Contingency (Days)',
        type: 'number',
        placeholder: '14',
        defaultValue: 14,
      },
      {
        key: 'financingDays',
        label: 'Financing Contingency (Days)',
        type: 'number',
        placeholder: '21',
        defaultValue: 21,
      },
    ],
  },
  {
    id: 'acq-step-4-negotiation',
    stepNumber: 4,
    title: 'Negotiation & Counteroffer',
    conversationalQuestion: 'Has the seller countered your initial price, earnest money, or contingency timelines?',
    whyThisMatters:
      'Active counteroffer tracking clarifies which contractual clauses are settled versus contested, protecting against unilateral concessions on earnest money or timeline traps.',
    requiredDocuments: ['Seller Counteroffer Addendum', 'Revised Term Summary', 'Broker Communications Log'],
    defaultRole: 'Transaction Coordinator',
    actionLabel: 'Record Terms & Move to PSA',
    inputs: [
      {
        key: 'counterPrice',
        label: 'Counteroffer Purchase Price',
        type: 'currency',
        placeholder: '$480,000',
      },
      {
        key: 'agreedClosingDate',
        label: 'Agreed Target Closing Date',
        type: 'date',
      },
      {
        key: 'sellerConcessions',
        label: 'Seller Concessions or Repair Credits',
        type: 'currency',
        placeholder: '$5,000',
      },
      {
        key: 'negotiationNotes',
        label: 'Negotiation Summary & Open Points',
        type: 'textarea',
        placeholder: 'Key concessions, contingencies modified, or timeline adjustments.',
      },
    ],
  },
  {
    id: 'acq-step-5-psa',
    stepNumber: 5,
    title: 'Purchase & Sale Agreement Execution',
    conversationalQuestion: 'Are all exhibits, legal descriptions, and bilateral signatures completed on the Purchase & Sale Agreement?',
    whyThisMatters:
      'The formal Purchase and Sale Agreement (PSA) is the legally binding instrument governing the transaction. Omissions in legal descriptions or default remedies expose equity to forfeiture.',
    requiredDocuments: [
      'Executed Purchase & Sale Agreement (PSA)',
      'Seller Disclosure Notice',
      'Lead-Based Paint / Environmental Disclosures',
    ],
    defaultRole: 'Legal Counsel',
    actionLabel: 'Confirm Executed PSA & Open Escrow',
    inputs: [
      {
        key: 'psaEffectiveDate',
        label: 'PSA Effective Contract Date',
        type: 'date',
        required: true,
      },
      {
        key: 'titleCompanyEscrow',
        label: 'Title Company & Escrow Officer',
        type: 'text',
        placeholder: 'e.g. First American Title / Jane Smith',
      },
      {
        key: 'contractDocumentUrl',
        label: 'Executed Contract Document Reference',
        type: 'text',
        placeholder: '/documents/psa_executed.pdf',
      },
    ],
  },
  {
    id: 'acq-step-6-diligence',
    stepNumber: 6,
    title: 'Due Diligence & Inspections',
    conversationalQuestion: 'Have property inspectors, structural engineers, and environmental consultants cleared the physical asset?',
    whyThisMatters:
      'Comprehensive physical, environmental, and municipal inspections uncover latent structural defects, deferred capital expenditures, and hazardous materials before contingency periods expire.',
    requiredDocuments: [
      'Property Inspection Report',
      'Structural Engineering Report',
      'Phase I ESA Report',
      'Municipal Code Compliance Check',
    ],
    defaultRole: 'Appraiser / Inspector',
    actionLabel: 'Approve Due Diligence Findings',
    inputs: [
      {
        key: 'inspectionStatus',
        label: 'Physical Inspection Status',
        type: 'select',
        options: [
          { label: 'Completed - Satisfactory', value: 'satisfactory' },
          { label: 'Completed - Repair Credits Required', value: 'repair_credits' },
          { label: 'In Progress', value: 'in_progress' },
        ],
      },
      {
        key: 'repairCreditRequested',
        label: 'Requested Repair Credit / Price Reduction',
        type: 'currency',
        placeholder: '$12,500',
      },
      {
        key: 'diligenceSignoffNotes',
        label: 'Diligence Sign-Off Findings',
        type: 'textarea',
        placeholder: 'Summary of roof, HVAC, foundation, and environmental findings.',
      },
    ],
  },
  {
    id: 'acq-step-7-financing',
    stepNumber: 7,
    title: 'Clear to Close & Financing',
    conversationalQuestion: 'Has the lender issued formal Clear to Close status and provided closing loan documents to escrow?',
    whyThisMatters:
      'Financing contingencies must be formally satisfied with unconditional lender commitment letters to prevent default and safeguard earnest money before removing contractual outs.',
    requiredDocuments: ['Lender Clear to Close (CTC) Notice', 'Final Closing Disclosure (CD)', 'Hazard & Flood Insurance Binder'],
    defaultRole: 'Lender / Debt Broker',
    actionLabel: 'Confirm Clear to Close',
    inputs: [
      {
        key: 'finalLoanAmount',
        label: 'Final Approved Loan Amount',
        type: 'currency',
        placeholder: '$363,750',
        required: true,
      },
      {
        key: 'finalInterestRate',
        label: 'Locked Interest Rate (%)',
        type: 'number',
        placeholder: '6.875',
      },
      {
        key: 'cashToCloseAmount',
        label: 'Total Cash to Close Required',
        type: 'currency',
        placeholder: '$135,200',
        required: true,
      },
    ],
  },
  {
    id: 'acq-step-8-settlement',
    stepNumber: 8,
    title: 'Settlement & Deed Recordation',
    conversationalQuestion: 'Has the wire been confirmed, settlement statement signed, and the deed recorded with the county clerk?',
    whyThisMatters:
      'Legal transfer of ownership occurs upon county deed recordation. Escrow confirmation protects against intervening title liens between closing table funding and recording.',
    requiredDocuments: ['Signed ALTA Settlement Statement', 'Recorded Warranty / Special Deed', 'Owner Title Policy Binder'],
    defaultRole: 'Title & Escrow Officer',
    actionLabel: 'Mark Phase Complete & Transition to Fund / Hold',
    inputs: [
      {
        key: 'recordingBookPage',
        label: 'County Deed Recording Document / Instrument #',
        type: 'text',
        placeholder: 'Doc #2026-049812',
        required: true,
      },
      {
        key: 'settlementDate',
        label: 'Formal Settlement Date',
        type: 'date',
        required: true,
      },
      {
        key: 'finalPurchasePrice',
        label: 'Final Reconciled Purchase Price',
        type: 'currency',
        placeholder: '$485,000',
      },
    ],
  },
];

export const FUND_CONVERSATIONAL_STEPS: ConversationalStep[] = [
  {
    id: 'fund-step-1-termsheet',
    stepNumber: 1,
    title: 'Lender Term Sheet',
    conversationalQuestion: 'Which debt lender is providing senior financing, and what are the interest rate, LTV, and origination points?',
    whyThisMatters:
      'Comparing debt covenants, personal guarantee requirements, and prepayment penalties across term sheets safeguards against toxic acceleration clauses.',
    requiredDocuments: ['Signed Lender Term Sheet', 'Debt Broker Engagement Letter', 'Borrower Track Record Summary', 'Capital Stack Ledger'],
    defaultRole: 'Lender / Debt Broker',
    actionLabel: 'Lock Term Sheet & Capital Stack',
    inputs: [
      {
        key: 'lenderName',
        label: 'Senior Debt Lender Name',
        type: 'text',
        placeholder: 'e.g. Apex Commercial Capital',
        required: true,
      },
      {
        key: 'loanAmount',
        label: 'Approved Facility Amount',
        type: 'currency',
        placeholder: '$363,750',
        required: true,
      },
      {
        key: 'interestRatePct',
        label: 'Interest Rate (%)',
        type: 'number',
        placeholder: '6.875',
        required: true,
      },
      {
        key: 'amortizationYears',
        label: 'Amortization Period (Years)',
        type: 'number',
        placeholder: '30',
        defaultValue: 30,
      },
      {
        key: 'investorEquity',
        label: 'Investor / LP Equity Committed',
        type: 'currency',
        placeholder: '$85,000',
      },
      {
        key: 'leadEquity',
        label: 'Lead Investor Equity Committed',
        type: 'currency',
        placeholder: '$68,840',
      },
    ],
  },
  {
    id: 'fund-step-2-emd',
    stepNumber: 2,
    title: 'Earnest Money Deposit',
    conversationalQuestion: 'Has the initial earnest money deposit been wired to the title escrow account within contractual deadlines?',
    whyThisMatters:
      'Failure to wire earnest money strictly within the contractual PSA window constitutes a material breach of contract, allowing the seller to terminate and keep backup offers.',
    requiredDocuments: ['Escrow EMD Receipt', 'Bank Wire Transfer Confirmation', 'Title Escrow Instructions'],
    defaultRole: 'Transaction Coordinator',
    actionLabel: 'Verify EMD Receipt',
    inputs: [
      {
        key: 'emdAmount',
        label: 'Earnest Money Deposit Amount',
        type: 'currency',
        placeholder: '$10,000',
        required: true,
      },
      {
        key: 'escrowHolder',
        label: 'Escrow Title Agent / Company',
        type: 'text',
        placeholder: 'First American Title Escrow',
        required: true,
      },
      {
        key: 'wireReferenceNumber',
        label: 'Bank Wire Confirmation Number',
        type: 'text',
        placeholder: 'WIRE-2026-99214',
      },
      {
        key: 'depositDueDate',
        label: 'Contractual Deposit Due Date',
        type: 'date',
      },
    ],
  },
  {
    id: 'fund-step-3-appraisal',
    stepNumber: 3,
    title: 'Narrative Appraisal & Environmental',
    conversationalQuestion: 'Did the commercial narrative appraisal meet or exceed the contract purchase price, and has Phase I ESA cleared?',
    whyThisMatters:
      'Lenders size loans based on the lesser of purchase price or appraised value. An appraisal shortfall creates an immediate equity gap requiring price renegotiation, cash injection, or a formal rebuttal.',
    requiredDocuments: ['Commercial Narrative Appraisal Report', 'Phase I Environmental Site Assessment', 'Appraisal Review Acceptance'],
    defaultRole: 'Appraiser / Inspector',
    actionLabel: 'Record Appraisal & Environmental Clearances',
    inputs: [
      {
        key: 'appraisedValue',
        label: 'Narrative Appraised Value',
        type: 'currency',
        placeholder: '$500,000',
        required: true,
      },
      {
        key: 'appraisalCompany',
        label: 'Appraisal Firm / Appraiser',
        type: 'text',
        placeholder: 'CBRE Valuation Services',
      },
      {
        key: 'gapResolutionStrategy',
        label: 'Appraisal Gap Resolution Strategy (if value < purchase price)',
        type: 'select',
        options: [
          { label: 'None / Appraised Value at or above Purchase Price', value: 'none' },
          { label: 'Renegotiate Purchase Price with Seller', value: 'renegotiate_price' },
          { label: 'Inject Additional Cash Equity to Preserve Loan Terms', value: 'inject_equity' },
          { label: 'Submit Formal Reconsideration of Value (ROV) Rebuttal', value: 'rebuttal' },
        ],
      },
      {
        key: 'phase1EsaStatus',
        label: 'Phase I Environmental Site Assessment Status',
        type: 'select',
        options: [
          { label: 'Phase I Clean (No RECs)', value: 'clean' },
          { label: 'Recognized Environmental Condition (REC) Identified', value: 'rec_identified' },
          { label: 'Phase II Subsurface Testing Recommended', value: 'phase2_recommended' },
          { label: 'Environmental Review Waived', value: 'waived' },
        ],
      },
    ],
  },
  {
    id: 'fund-step-4-title',
    stepNumber: 4,
    title: 'Title & Liens Clearance',
    conversationalQuestion: 'Has the title commitment cleared all Schedule B requirements, outstanding tax liens, and boundary easements?',
    whyThisMatters:
      'Marketable title ensures no unrecorded mechanics liens, boundary encroachments, or prior owner judgments cloud title or impair subsequent disposition.',
    requiredDocuments: ['Preliminary Title Commitment', 'Schedule B Exceptions Review', 'Municipal Tax Certificate', 'Boundary Survey / ALTA Plat'],
    defaultRole: 'Title & Escrow Officer',
    actionLabel: 'Clear Title Commitment & Curative Items',
    inputs: [
      {
        key: 'titleCommitmentNumber',
        label: 'Title Commitment File Number',
        type: 'text',
        placeholder: 'TC-88912-TX',
        required: true,
      },
      {
        key: 'titleInsurer',
        label: 'Title Underwriter / Insurer',
        type: 'text',
        placeholder: 'Chicago Title Insurance Company',
      },
      {
        key: 'surveyStatus',
        label: 'ALTA / Boundary Survey Review Status',
        type: 'select',
        options: [
          { label: 'Survey Clean (No Boundary Encroachments)', value: 'clean' },
          { label: 'Easements or Setback Encroachments Noted', value: 'encroachments_noted' },
          { label: 'Survey In Progress', value: 'pending' },
          { label: 'Survey Waived by Title & Lender', value: 'waived' },
        ],
      },
      {
        key: 'curativeItemsSummary',
        label: 'Curative Matters / Lien Releases Cleared',
        type: 'textarea',
        placeholder: 'Prior mortgage payoff received, municipal tax cert current.',
      },
    ],
  },
  {
    id: 'fund-step-5-insurance',
    stepNumber: 5,
    title: 'Insurance Binder & Entity Docs',
    conversationalQuestion: 'Are the purchasing LLC entity formation docs, Good Standing status, and commercial insurance binder finalized?',
    whyThisMatters:
      'Lenders mandate specific loss payee and additional insured endorsements alongside verified LLC corporate authority before authorizing loan documentation.',
    requiredDocuments: ['Certificate of Insurance (COI) & Binder', 'LLC Operating Agreement', 'Certificate of Good Standing', 'Lender Loss Payee Endorsement'],
    defaultRole: 'Legal Counsel',
    actionLabel: 'Attach Entity & Insurance Clearances',
    inputs: [
      {
        key: 'entityName',
        label: 'Vesting Entity Legal Name',
        type: 'text',
        placeholder: '1247 Elm Street Capital LLC',
        required: true,
      },
      {
        key: 'vestingEntityState',
        label: 'State of LLC Formation',
        type: 'text',
        placeholder: 'FL',
      },
      {
        key: 'authorizedSignatory',
        label: 'Authorized Manager / Signatory Name',
        type: 'text',
        placeholder: 'Jordan Taylor',
      },
      {
        key: 'insuranceCarrier',
        label: 'Insurance Carrier & Broker',
        type: 'text',
        placeholder: 'Travelers / Brown & Brown Insurance',
        required: true,
      },
      {
        key: 'annualPremium',
        label: 'Annual Hazard & Liability Premium',
        type: 'currency',
        placeholder: '$3,400',
      },
    ],
  },
  {
    id: 'fund-step-6-escrow',
    stepNumber: 6,
    title: 'Closing Disclosure & Escrow Wire',
    conversationalQuestion: 'Have you verified wire instructions by phone, reconciled the Closing Disclosure, and recorded the deed?',
    whyThisMatters:
      'Voice phone verification prevents catastrophic wire fraud. Final ALTA reconciliation confirms exact cash-to-close before irreversible wire transmission and county deed recordation.',
    requiredDocuments: ['Final Closing Disclosure (CD)', 'Outgoing Wire Receipt', 'Lender Funding Authorization', 'Recorded County Deed'],
    defaultRole: 'Lead Underwriter',
    actionLabel: 'Verify Wire, Authorize Funding & Record Deed',
    inputs: [
      {
        key: 'actualCashToClose',
        label: 'Final Certified Cash to Close',
        type: 'currency',
        placeholder: '$131,250',
        required: true,
      },
      {
        key: 'wireVerifiedPhone',
        label: 'Title Phone Number Verified by Voice Call',
        type: 'text',
        placeholder: '(813) 555-0144',
        required: true,
      },
      {
        key: 'escrowWireNumber',
        label: 'Outgoing Fed Wire Reference',
        type: 'text',
        placeholder: 'FEDWIRE-2026-004819',
      },
      {
        key: 'deedInstrumentNumber',
        label: 'County Deed Recording Instrument / Doc #',
        type: 'text',
        placeholder: 'DOC-2026-089412',
      },
    ],
  },
];

export const HOLD_CONVERSATIONAL_STEPS: ConversationalStep[] = [
  {
    id: 'hold-step-1-takeover',
    stepNumber: 1,
    title: 'Property Takeover & Utilities',
    conversationalQuestion: 'Have keys and electronic lockboxes been transferred, security codes changed, and utilities placed in the operating entity name?',
    whyThisMatters:
      'Immediate takeover protocols safeguard asset security, eliminate municipal freeze/water leak liabilities, and avoid disruption to tenant services or renovation schedules.',
    requiredDocuments: ['Utility Transfer Receipts', 'Key & Access Log', 'Property Takeover Condition Checklist'],
    defaultRole: 'Property Manager',
    actionLabel: 'Confirm Takeover & Utility Transition',
    inputs: [
      {
        key: 'takeoverDate',
        label: 'Official Takeover Date',
        type: 'date',
        required: true,
      },
      {
        key: 'electricAccount',
        label: 'Electric Utility Account #',
        type: 'text',
        placeholder: 'Austin Energy #998124',
      },
      {
        key: 'waterAccount',
        label: 'Water / Sewer Account #',
        type: 'text',
        placeholder: 'Austin Water #441029',
      },
      {
        key: 'lockboxCode',
        label: 'Master Lockbox / Keypad Access Code',
        type: 'text',
        placeholder: 'Safe digital vault reference',
      },
    ],
  },
  {
    id: 'hold-step-2-scope',
    stepNumber: 2,
    title: 'Contractor Scope Lock & Bids',
    conversationalQuestion: 'Which renovation tier defines the scope of work and are contracts executed with licensed contractors?',
    whyThisMatters:
      'Standardizing scope into STAGE, REFURBISH, RENOVATE, GUT, or DEVELOP tiers locks cost parameters before demolition starts, preventing contractor scope creep.',
    requiredDocuments: ['Executed General Contractor Agreement (AIA)', 'Line-Item Scope of Work (SOW)', 'Contractor COI & W-9'],
    defaultRole: 'General Contractor',
    actionLabel: 'Lock Contractor Scope & Budget',
    inputs: [
      {
        key: 'renovationTier',
        label: 'Target Renovation Tier',
        type: 'select',
        options: [
          { label: 'STAGE ($5,000 - $15,000) - Furnishings, Lighting, Paint Touch-Up', value: 'STAGE' },
          { label: 'REFURBISH ($15,000 - $35,000) - Paint, LVP Flooring, Hardware', value: 'REFURBISH' },
          { label: 'RENOVATE ($35,000 - $80,000) - Kitchen & Bath Remodel, Tile, Mechanicals', value: 'RENOVATE' },
          { label: 'GUT ($80,000 - $175,000) - Down to Studs, Framing, MEP Rough-Ins', value: 'GUT' },
          { label: 'DEVELOP ($175,000+) - Ground-Up, ADU Addition, Structural Expansion', value: 'DEVELOP' },
        ],
        required: true,
      },
      {
        key: 'generalContractor',
        label: 'General Contractor / Firm Name',
        type: 'text',
        placeholder: 'Marcus Vance / BuildPro LLC',
        required: true,
      },
      {
        key: 'contractedBudget',
        label: 'Executed Scope Contract Sum',
        type: 'currency',
        placeholder: '$65,000',
        required: true,
      },
      {
        key: 'targetCompletionDate',
        label: 'Contractual Substantial Completion Date',
        type: 'date',
      },
    ],
  },
  {
    id: 'hold-step-3-milestones',
    stepNumber: 3,
    title: 'Construction Milestones & Lien Waivers',
    conversationalQuestion: 'Are draw inspections scheduled, 10% retainage tracked, and unconditional lien waivers received?',
    whyThisMatters:
      'Paying contractors without progressive lien waivers permits subcontractors to cloud title with mechanics liens, freezing future refinances or sales.',
    requiredDocuments: ['Lender Draw Inspection Report', 'Unconditional Progress Lien Waivers', 'Photos of Completed Milestones'],
    defaultRole: 'General Contractor',
    actionLabel: 'Record Progress & Lien Waivers',
    inputs: [
      {
        key: 'currentDrawNumber',
        label: 'Active Draw Number',
        type: 'number',
        placeholder: '2',
        defaultValue: 1,
      },
      {
        key: 'drawAmountDisbursed',
        label: 'Draw Amount Disbursed to Date',
        type: 'currency',
        placeholder: '$28,500',
      },
      {
        key: 'percentComplete',
        label: 'Construction Progress Completion (%)',
        type: 'number',
        placeholder: '45',
        defaultValue: 40,
      },
      {
        key: 'retainageAmount',
        label: '10% Retainage Withheld ($)',
        type: 'currency',
        placeholder: '$2,850',
      },
    ],
  },
  {
    id: 'hold-step-4-tenant',
    stepNumber: 4,
    title: 'Tenant Placement & Lease',
    conversationalQuestion: 'Where is the property being marketed and has a qualified tenant signed the lease agreement?',
    whyThisMatters:
      'Multi-channel advertising (Zillow, CoStar, MLS, Facebook) compresses vacant holding days, accelerating cash flow stabilization and preserving flip margins.',
    requiredDocuments: ['Executed Residential / Commercial Lease', 'Marketing Campaign Performance Report', 'Tenant Screening / Credit Report'],
    defaultRole: 'Property Manager',
    actionLabel: 'Execute Lease & Record Tenant',
    inputs: [
      {
        key: 'primaryMarketingChannel',
        label: 'Primary Advertising Channel',
        type: 'select',
        options: [
          { label: 'Zillow Rental Manager / Showcase', value: 'Zillow' },
          { label: 'CoStar / Apartments.com', value: 'CoStar' },
          { label: 'Facebook Marketplace', value: 'Facebook' },
          { label: 'Local MLS / Realtor.com', value: 'MLS' },
          { label: 'Yard Signs & Broker Network', value: 'Direct' },
        ],
      },
      {
        key: 'monthlyRentActual',
        label: 'Contract Monthly Rent',
        type: 'currency',
        placeholder: '$3,850',
        required: true,
      },
      {
        key: 'marketingSpend',
        label: 'Total Marketing & Advertising Spend',
        type: 'currency',
        placeholder: '$250',
      },
      {
        key: 'leaseStartDate',
        label: 'Lease Commencement Date',
        type: 'date',
      },
    ],
  },
  {
    id: 'hold-step-5-accounting',
    stepNumber: 5,
    title: 'Operating Accounting & Holding Costs',
    conversationalQuestion: 'Are monthly PITI, 1% maintenance, 5-10% CapEx reserves, and 8-12% property management fees reconciling?',
    whyThisMatters:
      'Tracking daily burn rate ((Monthly Burn * 12) / 365) and holding drag preserves operating reserves and protects investor returns.',
    requiredDocuments: ['Monthly Operating Statement', 'Bank Reconciliation Ledger', 'Holding Cost Variance Report'],
    defaultRole: 'CPA / Tax Professional',
    actionLabel: 'Finalize Operating Ledger & Prepare for Exit',
    inputs: [
      {
        key: 'monthlyDebtService',
        label: 'Monthly P&I Debt Service ($/mo)',
        type: 'currency',
        placeholder: '$2,450',
        required: true,
      },
      {
        key: 'monthlyPropertyTaxes',
        label: 'Monthly Property Tax Escrow ($/mo)',
        type: 'currency',
        placeholder: '$480',
      },
      {
        key: 'monthlyLandlordInsurance',
        label: 'Landlord Hazard Insurance (DP-3 +15-20%)',
        type: 'currency',
        placeholder: '$260',
      },
      {
        key: 'monthlyNetOperatingIncome',
        label: 'Reconciled Net Operating Income (NOI)',
        type: 'currency',
        placeholder: '$2,750',
      },
    ],
  },
];

export const EXIT_CONVERSATIONAL_STEPS: ConversationalStep[] = [
  {
    id: 'exit-step-1-strategy',
    stepNumber: 1,
    title: 'Strategy Determination & Valuation',
    conversationalQuestion: 'Which disposition path optimizes capital return: outright sale, cash-out refinance, condo sell-off, or 1031 exchange?',
    whyThisMatters:
      'Market cap rate cycles and prevailing mortgage interest rates dictate whether a disposition or a long-term cash-out recapitalization yields superior risk-adjusted internal rate of return.',
    requiredDocuments: ['Comparative Market Analysis (CMA) / Broker Opinion of Value', 'Exit Financial Sensitivity Matrix', 'Tax Impact Assessment'],
    defaultRole: 'Lead Underwriter',
    actionLabel: 'Confirm Exit Strategy',
    inputs: [
      {
        key: 'exitStrategyChoice',
        label: 'Selected Disposition Route',
        type: 'select',
        options: [
          { label: 'Outright Sale / Flip (Discharge Debt & Liquidate)', value: 'outright_sale' },
          { label: 'Refinance & Retain (Cash-Out Recapitalization)', value: 'refinance_retain' },
          { label: 'Developed Condo Sales (Individual Unit Dispositions)', value: 'condo_selloff' },
          { label: 'Developed Co-op Sales (Share & Proprietary Lease Dispositions)', value: 'coop_selloff' },
          { label: 'Traditional Rental Portfolio Exit (1031 Exchange / Block Sale)', value: '1031_exchange' },
          { label: 'Lease Option / Rent-to-Own Exit', value: 'lease_option' },
        ],
        required: true,
      },
      {
        key: 'targetExitValuation',
        label: 'Target Exit Valuation',
        type: 'currency',
        placeholder: '$640,000',
        required: true,
      },
      {
        key: 'projectedNetProceeds',
        label: 'Estimated Net Capital Proceeds',
        type: 'currency',
        placeholder: '$185,000',
      },
    ],
  },
  {
    id: 'exit-step-2-marketing',
    stepNumber: 2,
    title: 'Marketing Launch & OM',
    conversationalQuestion: 'Are high-resolution photography, virtual tours, and the investment offering memorandum published to buyers?',
    whyThisMatters:
      'Broad buyer exposure through digital syndication and commercial broker networks creates competitive bidding tension that drives premium pricing.',
    requiredDocuments: ['Offering Memorandum (OM)', 'Professional Photography & Matterport', 'Commercial MLS / CoStar / LoopNet Listing Agreement'],
    defaultRole: 'Acquisitions Director',
    actionLabel: 'Publish Listing & Launch Campaign',
    inputs: [
      {
        key: 'listingBrokerName',
        label: 'Listing Broker / Team',
        type: 'text',
        placeholder: 'Marcus Brody / Compass Commercial',
      },
      {
        key: 'listPrice',
        label: 'Public Offering List Price',
        type: 'currency',
        placeholder: '$649,000',
        required: true,
      },
      {
        key: 'listingUrl',
        label: 'Marketing Page / Listing Link',
        type: 'text',
        placeholder: 'https://paperworking.com/marketplace/deal-1247-elm',
      },
    ],
  },
  {
    id: 'exit-step-3-offer',
    stepNumber: 3,
    title: 'Buyer Offer Selection & PSA',
    conversationalQuestion: 'Which buyer offer presents highest price certainty, shortest financing contingencies, and non-refundable earnest money?',
    whyThisMatters:
      'The highest headline offer is rarely the best deal if burdened by retrading contingencies or fragile buyer financing that jeopardizes closing execution.',
    requiredDocuments: ['Executed Disposition PSA', 'Buyer Proof of Funds & Pre-Approval', 'Non-Refundable Escrow EMD Receipt'],
    defaultRole: 'Legal Counsel',
    actionLabel: 'Select Buyer & Execute PSA',
    inputs: [
      {
        key: 'contractSalePrice',
        label: 'Contract Sale Price',
        type: 'currency',
        placeholder: '$645,000',
        required: true,
      },
      {
        key: 'buyerName',
        label: 'Buyer Legal Entity',
        type: 'text',
        placeholder: 'Sunbelt Multi-Asset Fund LP',
      },
      {
        key: 'closingTargetDate',
        label: 'Target Closing Date',
        type: 'date',
        required: true,
      },
      {
        key: 'buyerEmdAmount',
        label: 'Buyer Escrow Deposit',
        type: 'currency',
        placeholder: '$25,000',
      },
    ],
  },
  {
    id: 'exit-step-4-distribution',
    stepNumber: 4,
    title: 'Realized Return Reconciliation & Distribution',
    conversationalQuestion: 'Have net sales proceeds funded escrow, senior debt discharged, and final waterfall distributions calculated?',
    whyThisMatters:
      'Final accounting reconciles original capital invested against net exit distributions to verify achieved IRR, equity multiple, and complete K-1 tax documentation for partners.',
    requiredDocuments: ['Final ALTA Settlement Statement', 'Senior Debt Payoff Satisfaction Letter', 'Final Waterfall Distribution Ledger', 'Schedule K-1 Tax Packets'],
    defaultRole: 'CPA / Tax Professional',
    actionLabel: 'Finalize Distribution & Archive Project',
    inputs: [
      {
        key: 'grossRealizedSalePrice',
        label: 'Gross Realized Exit Price',
        type: 'currency',
        placeholder: '$645,000',
        required: true,
      },
      {
        key: 'netProceedsDistributed',
        label: 'Total Net Capital Distributed',
        type: 'currency',
        placeholder: '$210,400',
        required: true,
      },
      {
        key: 'achievedIrrPct',
        label: 'Achieved Deal IRR (%)',
        type: 'number',
        placeholder: '22.4',
        defaultValue: 22.4,
      },
      {
        key: 'equityMultiple',
        label: 'Achieved Equity Multiple (x)',
        type: 'number',
        placeholder: '1.68',
        defaultValue: 1.68,
      },
    ],
  },
];

export const REIL_CONVERSATIONAL_STEPS_BY_PHASE: Record<LegacyProjectPhase, ConversationalStep[]> = {
  acquisition: ACQUISITION_CONVERSATIONAL_STEPS,
  purchase: FUND_CONVERSATIONAL_STEPS,
  hold: HOLD_CONVERSATIONAL_STEPS,
  exit: EXIT_CONVERSATIONAL_STEPS,
};

export function getConversationalStepsForPhase(phase: LegacyProjectPhase): ConversationalStep[] {
  return REIL_CONVERSATIONAL_STEPS_BY_PHASE[phase] || ACQUISITION_CONVERSATIONAL_STEPS;
}

export function getConversationalStep(
  phase: LegacyProjectPhase,
  stepNumberOrId: number | string
): ConversationalStep | undefined {
  const steps = getConversationalStepsForPhase(phase);
  if (typeof stepNumberOrId === 'number') {
    return steps.find((s) => s.stepNumber === stepNumberOrId);
  }
  return steps.find((s) => s.id === stepNumberOrId);
}
