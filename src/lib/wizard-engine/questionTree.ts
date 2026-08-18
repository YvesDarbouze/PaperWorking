export type InputType = 'text' | 'number' | 'date' | 'file' | 'select' | 'multi';

export type REIPhase = 'acquisition' | 'purchase' | 'hold' | 'exit';

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  regex?: string;
  maxPastDays?: number;
}

export interface BranchRule {
  condition: string;
  next_question_id: string;
}

export interface WizardNode {
  question_id: string;
  question_text: string;
  description?: string;
  input_type: InputType;
  options?: Array<{ label: string; value: string }>;
  validation_rules?: ValidationRules;
  branches?: BranchRule[];
  default_next_question_id?: string;
  phase_trigger?: REIPhase;
}

export const INITIAL_QUESTION_TREE: WizardNode[] = [
  {
    question_id: 'Q1',
    question_text: 'What phase of the REI Lifecycle are you in?',
    description: 'Select the current investment phase for this property.',
    input_type: 'select',
    options: [
      { label: 'Acquisition (Sourcing & Underwriting)', value: 'acquisition' },
      { label: 'Purchase (Under Contract & Closing)', value: 'purchase' },
      { label: 'Hold (Rehab, Rental & Management)', value: 'hold' },
      { label: 'Exit (Listing, Sale & Disposition)', value: 'exit' },
    ],
    validation_rules: { required: true },
    branches: [
      { condition: "phase === 'acquisition'", next_question_id: 'Q2' },
      { condition: "phase === 'purchase'", next_question_id: 'Q2' },
      { condition: "phase === 'hold'", next_question_id: 'Q2' },
      { condition: "phase === 'exit'", next_question_id: 'Q2' },
    ],
    default_next_question_id: 'Q2',
  },
  {
    question_id: 'Q2',
    question_text: 'What is the property address?',
    description: 'Enter the full street address for geocoding and property data matching.',
    input_type: 'text',
    validation_rules: { required: true },
    default_next_question_id: 'Q3',
  },
  {
    question_id: 'Q3',
    question_text: 'What is the Date of Sale / Target Closing Date?',
    description: 'Date of acquisition or target closing. Dates up to 1 year in the past are permitted.',
    input_type: 'date',
    validation_rules: { required: true, maxPastDays: 365 },
    default_next_question_id: 'Q4',
  },
  {
    question_id: 'Q4',
    question_text: 'What is your entity type?',
    description: 'Select the owning legal entity structure for tax & reporting compliance.',
    input_type: 'select',
    options: [
      { label: 'Sole Proprietor', value: 'Sole Proprietor' },
      { label: 'LLC (Single-Member)', value: 'LLC (single)' },
      { label: 'LLC (Multi-Member)', value: 'LLC (multi)' },
      { label: 'S-Corporation', value: 'S-Corp' },
      { label: 'Partnership', value: 'Partnership' },
    ],
    validation_rules: { required: true },
    branches: [
      { condition: "entity_type === 'LLC (multi)' || entity_type === 'Partnership'", next_question_id: 'Q5' },
    ],
    default_next_question_id: 'Q5',
  },
  {
    question_id: 'Q5',
    question_text: 'What is the Purchase Price?',
    description: 'Enter the actual or projected purchase price in USD.',
    input_type: 'number',
    validation_rules: { required: true, min: 0 },
    branches: [
      { condition: "phase === 'acquisition'", next_question_id: 'Q7' },
    ],
    default_next_question_id: 'Q6',
  },
  {
    question_id: 'Q6',
    question_text: 'What is the estimated Rehab Budget?',
    description: 'Estimated capital expenditure for repairs or renovation.',
    input_type: 'number',
    validation_rules: { min: 0 },
    default_next_question_id: 'Q7',
  },
  {
    question_id: 'Q7',
    question_text: 'What is your Expected Exit Strategy?',
    description: 'Choose your primary exit path for this real estate investment.',
    input_type: 'select',
    options: [
      { label: 'Fix & Flip', value: 'Flip' },
      { label: 'Long-term Rental', value: 'Rental' },
      { label: 'Wholesale', value: 'Wholesale' },
      { label: 'BRRRR (Buy, Rehab, Rent, Refinance, Repeat)', value: 'BRRRR' },
    ],
    validation_rules: { required: true },
    default_next_question_id: 'Q8',
  },
  {
    question_id: 'Q8',
    question_text: 'Upload any existing documents',
    description: 'Attach purchase contracts, proof of funds, inspection reports, or closing packages.',
    input_type: 'file',
    validation_rules: { required: false },
  },
];
