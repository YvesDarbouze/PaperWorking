export interface WizardQuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

export type WizardQuestionType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'single-select'
  | 'multi-select'
  | 'file-upload'
  | 'address';

export interface WizardQuestion {
  id: string;
  prompt: string;
  subtext?: string;
  type: WizardQuestionType;
  field: string;
  options?: WizardQuestionOption[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  condition?: (answers: Record<string, any>) => boolean;
  weight?: number | ((answers: Record<string, any>) => number);
}

export const PROJECT_WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: 'address',
    prompt: 'Where is the property located?',
    subtext: 'Search MLS listings for the address or enter details manually.',
    type: 'address',
    field: 'address',
    required: true,
    weight: 10,
  },
  {
    id: 'propertyName',
    prompt: 'What should we call this Project?',
    subtext: 'Usually defaults to the street name.',
    type: 'text',
    field: 'propertyName',
    placeholder: 'e.g. The Miami Flip',
    required: true,
    weight: 20,
  },
  {
    id: 'assetClass',
    prompt: 'What type of asset is this?',
    type: 'single-select',
    field: 'assetClass',
    options: [
      { value: 'Residential', label: 'Residential' },
      { value: 'Multi-Family', label: 'Multi-Family' },
      { value: 'Commercial', label: 'Commercial' },
      { value: 'Land', label: 'Undeveloped Land' },
    ],
    defaultValue: 'Residential',
    required: true,
    weight: 30,
  },
  {
    id: 'strategyType',
    prompt: 'What is your investment strategy?',
    type: 'single-select',
    field: 'strategyType',
    options: [
      { value: 'Fix & Flip', label: 'Flip', description: 'Acquire, renovate, and sell for short-term profit.' },
      { value: 'Rent', label: 'Buy-and-hold Rental', description: 'Acquire, lease, and hold for long-term cash flow.' },
      { value: 'BRRRR', label: 'BRRRR', description: 'Buy, Rehab, Rent, Refinance, Repeat strategy.' },
    ],
    defaultValue: 'Fix & Flip',
    required: true,
    weight: 40,
  },
  {
    id: 'financingIntent',
    prompt: 'What is the financing intent for this Project?',
    type: 'single-select',
    field: 'financingIntent',
    options: [
      { value: 'all-cash', label: 'All-Cash', description: 'Purchase the property entirely with liquid capital.' },
      { value: 'financing', label: 'Financed / Leveraged', description: 'Use debt financing (mortgage, hard money, etc.).' },
    ],
    defaultValue: 'financing',
    required: true,
    weight: 50,
  },
  {
    id: 'raisingOutsideCapital',
    prompt: 'Are you raising outside capital for this Project?',
    type: 'single-select',
    field: 'raisingOutsideCapital',
    options: [
      { value: 'yes', label: 'Yes', description: 'Raise equity or debt from external investors.' },
      { value: 'no', label: 'No', description: 'Fund entirely using internal or personal capital.' },
    ],
    defaultValue: 'no',
    required: true,
    weight: 60,
  },
  // R0 — Ownership Percentage
  {
    id: 'ownershipPercentage',
    prompt: 'What percentage of this deal do you own?',
    subtext: 'If you have co-investors, enter your personal share. Default is 100%.',
    type: 'number',
    field: 'financials.ownershipPercentage',
    placeholder: '100',
    defaultValue: 100,
    weight: 65,
  },
  {
    id: 'isBackdated',
    prompt: 'Do you already own this property?',
    subtext: 'Select Yes if the property has been acquired, is mid-rehab, or has been sold.',
    type: 'single-select',
    field: 'isBackdated',
    options: [
      { value: 'no', label: 'Not Yet', description: 'Currently prospecting or under contract.' },
      { value: 'yes', label: 'Yes, I Own It', description: 'Already acquired — entering actuals.' },
    ],
    defaultValue: 'no',
    required: true,
    weight: 70,
  },
  {
    id: 'startingPhase',
    prompt: 'Which phase is this Project entering at?',
    type: 'single-select',
    field: 'startingPhase',
    options: [
      { value: 1, label: 'Phase 1: Find & Fund', description: 'Initial sourcing and evaluation.' },
      { value: 2, label: 'Phase 2: Acquisition', description: 'Under contract, closing prep, and due diligence.' },
      { value: 3, label: 'Phase 3: Rehab & Hold', description: 'Active construction, stabilization, or lease-up.' },
      { value: 4, label: 'Phase 4: Closing & Exit', description: 'Listed, sold, or finalized disposition.' },
    ],
    defaultValue: 1,
    required: true,
    weight: 80,
  },
  {
    id: 'acquisitionDate',
    prompt: 'When did you acquire this property?',
    type: 'date',
    field: 'financials.acquisitionDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' || answers.startingPhase >= 2,
    weight: (answers) => (answers.isBackdated === 'yes' ? 85 : 140),
  },
  {
    id: 'rehabActual',
    prompt: 'What was the actual rehab cost? ($)',
    type: 'currency',
    field: 'financials.rehabActual',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' && answers.startingPhase >= 3,
    weight: 87,
  },
  {
    id: 'dateOfSale',
    prompt: 'When was this property sold?',
    type: 'date',
    field: 'financials.soldDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' && answers.startingPhase === 4,
    weight: 90,
  },
  {
    id: 'actualSalePrice',
    prompt: 'What was the actual sale price? ($)',
    type: 'currency',
    field: 'financials.actualSalePrice',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' && answers.startingPhase === 4,
    weight: 100,
  },
  {
    id: 'purchasePrice',
    prompt: 'What was the actual purchase price? ($)',
    subtext: 'The real closing price for this backdated project.',
    type: 'currency',
    field: 'financials.purchasePrice',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes',
    weight: 95,
  },
  // ── P1 Acquisition Projected Underwriting Questions ──────────────────
  {
    id: 'targetPrice',
    prompt: 'What is your target purchase price? ($)',
    subtext: 'Projected — the price you plan to offer or negotiate toward.',
    type: 'currency',
    field: 'financials.targetPrice',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'no',
    weight: 100,
  },
  {
    id: 'projectedRent',
    prompt: 'What monthly rent do you expect? ($)',
    subtext: 'Projected — used to calculate NOI, GRM, and Cap Rate.',
    type: 'currency',
    field: 'financials.projectedRent',
    placeholder: '0.00',
    required: true,
    condition: (answers) =>
      answers.isBackdated === 'no' &&
      (answers.strategyType === 'Rent' || answers.strategyType === 'BRRRR'),
    weight: 105,
  },
  {
    id: 'projectedSalePrice',
    prompt: 'What is the estimated after-repair value (ARV) / projected sale price? ($)',
    subtext: 'Projected — the price you expect to sell for after rehab.',
    type: 'currency',
    field: 'financials.projectedSalePrice',
    placeholder: '0.00',
    required: true,
    condition: (answers) =>
      answers.isBackdated === 'no' && answers.strategyType === 'Fix & Flip',
    weight: 105,
  },
  {
    id: 'projectedOpex',
    prompt: 'What are the estimated monthly operating expenses? ($)',
    subtext: 'Projected — insurance, taxes, utilities, maintenance, etc.',
    type: 'currency',
    field: 'financials.projectedOpex',
    placeholder: '0.00',
    condition: (answers) => answers.isBackdated === 'no',
    weight: 108,
  },
  {
    id: 'estimatedARV',
    prompt: 'What is the estimated After-Repair Value (ARV)? ($)',
    type: 'currency',
    field: 'financials.estimatedARV',
    placeholder: '0.00',
    required: true,
    condition: (answers) =>
      answers.isBackdated === 'yes' && answers.strategyType === 'Fix & Flip' && answers.startingPhase < 4,
    weight: 120,
  },
  {
    id: 'closeDate',
    prompt: 'When do you expect to close?',
    type: 'date',
    field: 'financials.estimatedCloseDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'no',
    weight: 130,
  },
  {
    id: 'loanAmount',
    prompt: 'What is the loan amount? ($)',
    type: 'currency',
    field: 'financials.loanAmount',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.financingIntent === 'financing',
    weight: 150,
  },
  {
    id: 'loanInterestRate',
    prompt: 'What is the loan interest rate? (%)',
    type: 'number',
    field: 'financials.loanInterestRate',
    placeholder: 'e.g. 6.5',
    required: true,
    condition: (answers) => answers.financingIntent === 'financing',
    weight: 160,
  },
  {
    id: 'loanTermYears',
    prompt: 'What is the loan term in years?',
    type: 'number',
    field: 'financials.loanTermYears',
    placeholder: 'e.g. 30',
    required: true,
    condition: (answers) => answers.financingIntent === 'financing',
    weight: 170,
  },
  {
    id: 'requiredContingencies',
    prompt: 'Which contingencies are required for this acquisition?',
    subtext: 'Select all that apply.',
    type: 'multi-select',
    field: 'financials.requiredContingencies',
    options: [
      { value: 'inspection', label: 'Inspection Contingency', description: 'Subject to property inspection report.' },
      { value: 'financing', label: 'Financing Contingency', description: 'Subject to securing debt financing.' },
      { value: 'appraisal', label: 'Appraisal Contingency', description: 'Subject to appraisal matching sale price.' },
    ],
    defaultValue: [],
    weight: 175,
    condition: (answers) => answers.isBackdated === 'no' && answers.startingPhase <= 2,
  },
  {
    id: 'capitalRaiseTarget',
    prompt: 'What is your capital raise target? ($)',
    type: 'currency',
    field: 'financials.capitalRaiseTarget',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.raisingOutsideCapital === 'yes',
    weight: 180,
  },
  {
    id: 'equitySplit',
    prompt: 'What is the projected equity split for outside investors? (%)',
    type: 'number',
    field: 'financials.equitySplit',
    placeholder: 'e.g. 30',
    required: true,
    condition: (answers) => answers.raisingOutsideCapital === 'yes',
    weight: 190,
  },
  {
    id: 'investorInvites',
    prompt: 'Who should we invite to invest? (email addresses)',
    subtext: 'Comma-separated list — these contacts will be added to the investor CRM.',
    type: 'text',
    field: 'financials.investorInvites',
    placeholder: 'investor1@example.com, investor2@example.com',
    condition: (answers) =>
      answers.raisingOutsideCapital === 'yes' && answers.isBackdated === 'no',
    weight: 195,
  },
  {
    id: 'marketplaceListing',
    prompt: 'Would you like to post this deal to the Deal Marketplace?',
    subtext: 'Projected — the Deal Marketplace lets other investors discover your project.',
    type: 'single-select',
    field: 'financials.marketplaceListing',
    options: [
      { value: 'yes', label: 'Yes', description: 'List on the Deal Marketplace for discovery.' },
      { value: 'no', label: 'No', description: 'Keep this deal private.' },
    ],
    defaultValue: 'no',
    condition: (answers) =>
      answers.raisingOutsideCapital === 'yes' && answers.isBackdated === 'no',
    weight: 198,
  },
  // ── Offer Tracking ────────────────────────────────────────────────────
  {
    id: 'offerStatus',
    prompt: 'Have you made an offer on this property?',
    subtext: 'Projected — tracks the current status of your purchase offer.',
    type: 'single-select',
    field: 'financials.offerStatus',
    options: [
      { value: 'No', label: 'No Offer Yet', description: 'Still evaluating the deal.' },
      { value: 'Drafting', label: 'Drafting', description: 'Preparing the offer letter.' },
      { value: 'Offer Sent', label: 'Offer Sent', description: 'Offer submitted, awaiting response.' },
      { value: 'Accepted', label: 'Accepted / Under Contract', description: 'Offer accepted — ready to advance.' },
      { value: 'Rejected', label: 'Rejected / Expired', description: 'Offer was declined or expired.' },
    ],
    defaultValue: 'No',
    condition: (answers) => answers.isBackdated === 'no',
    weight: 215,
  },
  {
    id: 'offerAmount',
    prompt: 'What was the offer amount? ($)',
    subtext: 'Projected — the exact dollar amount submitted in the offer.',
    type: 'currency',
    field: 'financials.offerAmount',
    placeholder: '0.00',
    required: true,
    condition: (answers) =>
      answers.isBackdated === 'no' &&
      (getNestedField(answers, 'financials.offerStatus') === 'Offer Sent' ||
       getNestedField(answers, 'financials.offerStatus') === 'Accepted'),
    weight: 216,
  },
  {
    id: 'offerDate',
    prompt: 'When was the offer submitted?',
    subtext: 'Projected — the date the offer was sent to the seller or listing agent.',
    type: 'date',
    field: 'financials.offerDate',
    required: true,
    condition: (answers) =>
      answers.isBackdated === 'no' &&
      (getNestedField(answers, 'financials.offerStatus') === 'Offer Sent' ||
       getNestedField(answers, 'financials.offerStatus') === 'Accepted'),
    weight: 217,
  },
  {
    id: 'purchaseContractDoc',
    prompt: 'Upload the Purchase Contract (optional)',
    type: 'file-upload',
    field: 'financials.purchaseContractDoc',
    condition: (answers) => answers.startingPhase >= 2,
    weight: 200,
  },
  {
    id: 'leadEmail',
    prompt: 'What is the lead operator email?',
    type: 'text',
    field: 'leadEmail',
    placeholder: 'operator@example.com',
    required: true,
    weight: 210,
  },
  {
    id: 'partnerEmails',
    prompt: 'What are the partner emails? (optional)',
    subtext: 'Comma-separated list of email addresses.',
    type: 'text',
    field: 'partnerEmails',
    placeholder: 'partner1@example.com, partner2@example.com',
    weight: 220,
  },
  {
    id: 'vision',
    prompt: 'Can you describe the project vision / operational objective? (optional)',
    type: 'text',
    field: 'vision',
    placeholder: 'Describe your rehab plan, hold period, or exit strategy objectives...',
    weight: 230,
  },
];

/**
 * Evaluates conditions declarations dynamically based on the current answers.
 */
export function getActiveQuestions(answers: Record<string, any>): WizardQuestion[] {
  return PROJECT_WIZARD_QUESTIONS.filter((q) => {
    if (q.condition) {
      return q.condition(answers);
    }
    return true;
  }).sort((a, b) => {
    const weightA = typeof a.weight === 'function' ? a.weight(answers) : (a.weight ?? 100);
    const weightB = typeof b.weight === 'function' ? b.weight(answers) : (b.weight ?? 100);
    return weightA - weightB;
  });
}

/**
 * Assigns a nested value using a dotted path.
 */
export function setNestedField(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Reads a nested value using a dotted path.
 */
export function getNestedField(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}
