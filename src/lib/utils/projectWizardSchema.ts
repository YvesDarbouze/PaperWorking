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
  defaultValue?: string | number;
  condition?: (answers: Record<string, any>) => boolean;
}

export const PROJECT_WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: 'address',
    prompt: 'Where is the property located?',
    subtext: 'Search MLS listings for the address or enter details manually.',
    type: 'address',
    field: 'address',
    required: true,
  },
  {
    id: 'propertyName',
    prompt: 'What should we call this Project?',
    subtext: 'Usually defaults to the street name.',
    type: 'text',
    field: 'propertyName',
    placeholder: 'e.g. The Miami Flip',
    required: true,
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
  },
  {
    id: 'strategyType',
    prompt: 'What is your investment strategy?',
    type: 'single-select',
    field: 'strategyType',
    options: [
      { value: 'Fix & Flip', label: 'Fix & Flip', description: 'Acquire, renovate, and sell for short-term profit.' },
      { value: 'Rent', label: 'Buy-and-hold Rental', description: 'Acquire, lease, and hold for long-term cash flow.' },
      { value: 'BRRRR', label: 'BRRRR', description: 'Buy, Rehab, Rent, Refinance, Repeat strategy.' },
    ],
    defaultValue: 'Fix & Flip',
    required: true,
  },
  {
    id: 'financingIntent',
    prompt: 'What is the financing intent for this Project?',
    type: 'single-select',
    field: 'financingIntent',
    options: [
      { value: 'all-cash', label: 'All-Cash', description: 'Purchase the property entirely with liquid capital.' },
      { value: 'financed', label: 'Financed / Leveraged', description: 'Use debt financing (mortgage, hard money, etc.).' },
    ],
    defaultValue: 'financed',
    required: true,
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
  },
  {
    id: 'isBackdated',
    prompt: 'Is this a past or backdated Project?',
    subtext: 'Select Yes if the property has already been acquired or closed.',
    type: 'single-select',
    field: 'isBackdated',
    options: [
      { value: 'no', label: 'No (Projections)', description: 'Project is active or a pipeline target.' },
      { value: 'yes', label: 'Yes (Backdated/Actuals)', description: 'Project was completed or acquired in the past.' },
    ],
    defaultValue: 'no',
    required: true,
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
  },
  {
    id: 'dateOfSale',
    prompt: 'When was this property sold?',
    type: 'date',
    field: 'financials.soldDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' && answers.startingPhase === 4,
  },
  {
    id: 'actualSalePrice',
    prompt: 'What was the actual sale price? ($)',
    type: 'currency',
    field: 'financials.actualSalePrice',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' && answers.startingPhase === 4,
  },
  {
    id: 'purchasePrice',
    prompt: 'What is the purchase price? ($)',
    type: 'currency',
    field: 'financials.purchasePrice',
    placeholder: '0.00',
    required: true,
  },
  {
    id: 'estimatedARV',
    prompt: 'What is the estimated After-Repair Value (ARV)? ($)',
    type: 'currency',
    field: 'financials.estimatedARV',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.isBackdated === 'no' || answers.startingPhase < 4,
  },
  {
    id: 'closeDate',
    prompt: 'When do you expect to close?',
    type: 'date',
    field: 'financials.estimatedCloseDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'no',
  },
  {
    id: 'acquisitionDate',
    prompt: 'When did you acquire this property?',
    type: 'date',
    field: 'financials.acquisitionDate',
    required: true,
    condition: (answers) => answers.isBackdated === 'yes' || answers.startingPhase >= 2,
  },
  {
    id: 'loanAmount',
    prompt: 'What is the loan amount? ($)',
    type: 'currency',
    field: 'financials.loanAmount',
    placeholder: '0.00',
    required: true,
    condition: (answers) => answers.financingIntent === 'financed',
  },
  {
    id: 'loanInterestRate',
    prompt: 'What is the loan interest rate? (%)',
    type: 'number',
    field: 'financials.loanInterestRate',
    placeholder: 'e.g. 6.5',
    required: true,
    condition: (answers) => answers.financingIntent === 'financed',
  },
  {
    id: 'loanTermYears',
    prompt: 'What is the loan term in years?',
    type: 'number',
    field: 'financials.loanTermYears',
    placeholder: 'e.g. 30',
    required: true,
    condition: (answers) => answers.financingIntent === 'financed',
  },
  {
    id: 'purchaseContractDoc',
    prompt: 'Upload the Purchase Contract (optional)',
    type: 'file-upload',
    field: 'financials.purchaseContractDoc',
    condition: (answers) => answers.startingPhase >= 2,
  },
  {
    id: 'leadEmail',
    prompt: 'What is the lead operator email?',
    type: 'text',
    field: 'leadEmail',
    placeholder: 'operator@example.com',
    required: true,
  },
  {
    id: 'partnerEmails',
    prompt: 'What are the partner emails? (optional)',
    subtext: 'Comma-separated list of email addresses.',
    type: 'text',
    field: 'partnerEmails',
    placeholder: 'partner1@example.com, partner2@example.com',
  },
  {
    id: 'vision',
    prompt: 'Can you describe the project vision / operational objective? (optional)',
    type: 'text',
    field: 'vision',
    placeholder: 'Describe your rehab plan, hold period, or exit strategy objectives...',
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
