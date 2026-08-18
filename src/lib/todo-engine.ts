import { REIPhase } from './wizard-engine/questionTree';

export interface TodoItem {
  id: string;
  type: 'question' | 'file' | 'task';
  content: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  phase: REIPhase;
  action_label?: string;
}

export const PHASE_CHECKLISTS: Record<REIPhase, { id: string; label: string; fieldKey?: string }[]> = {
  acquisition: [
    { id: 'chk_acq_1', label: 'Property Address Specified', fieldKey: 'property_address' },
    { id: 'chk_acq_2', label: 'Entity Structure Selected', fieldKey: 'entity_type' },
    { id: 'chk_acq_3', label: 'Target Purchase Price Set', fieldKey: 'purchase_price' },
    { id: 'chk_acq_4', label: 'Proof of Funds Document Uploaded', fieldKey: 'proof_of_funds_doc' },
    { id: 'chk_acq_5', label: 'Maximum Offer Price Calculated', fieldKey: 'max_offer_price' },
    { id: 'chk_acq_6', label: 'Real Estate Attorney Assigned', fieldKey: 'attorney_user_id' },
    { id: 'chk_acq_7', label: 'Draft Offer Letter Generated', fieldKey: 'offer_letter_doc' },
  ],
  purchase: [
    { id: 'chk_pur_1', label: 'Executed Purchase Agreement Uploaded', fieldKey: 'purchase_contract_doc' },
    { id: 'chk_pur_2', label: 'Earnest Money Deposit Confirmed', fieldKey: 'earnest_money_amount' },
    { id: 'chk_pur_3', label: 'Title Search Report Received', fieldKey: 'title_search_doc' },
    { id: 'chk_pur_4', label: 'Lender Commitment Letter Verified', fieldKey: 'lender_commitment_doc' },
    { id: 'chk_pur_5', label: 'Final Settlement Statement (HUD-1/Closing Disclosure) Signed', fieldKey: 'closing_disclosure_doc' },
  ],
  hold: [
    { id: 'chk_hld_1', label: 'Rehab Scope of Work Finalized', fieldKey: 'rehab_budget' },
    { id: 'chk_hld_2', label: 'General Contractor Assigned', fieldKey: 'gc_vendor_id' },
    { id: 'chk_hld_3', label: 'Hazard & Liability Insurance Active', fieldKey: 'insurance_policy_doc' },
    { id: 'chk_hld_4', label: 'Tenant Lease Agreement Executed', fieldKey: 'lease_agreement_doc' },
    { id: 'chk_hld_5', label: 'Monthly Operating Account & P&L Initialized', fieldKey: 'pnl_initialized' },
  ],
  exit: [
    { id: 'chk_ext_1', label: 'Listing Broker Agreement Signed', fieldKey: 'listing_agreement_doc' },
    { id: 'chk_ext_2', label: 'Property Staging & Photography Completed', fieldKey: 'staging_completed' },
    { id: 'chk_ext_3', label: 'Final Sale Contract Executed', fieldKey: 'exit_sale_price' },
    { id: 'chk_ext_4', label: 'IRS Form 1099-S / Settlement Statement Uploaded', fieldKey: 'form_1099s_doc' },
    { id: 'chk_ext_5', label: 'Capital Gains & 1031 Exchange Calculation Completed', fieldKey: 'cap_gains_calculated' },
  ],
};

export function generateTodosForPhase(
  phase: REIPhase,
  answers: Record<string, any> = {}
): TodoItem[] {
  const now = new Date();
  const formatDueDate = (daysAhead: number) => {
    const d = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  switch (phase) {
    case 'acquisition':
      return [
        {
          id: 'todo_acq_1',
          type: 'file',
          content: 'Upload your proof of funds letter',
          status: answers.proof_of_funds_doc ? 'completed' : 'pending',
          due_date: formatDueDate(3),
          phase: 'acquisition',
          action_label: 'Upload Letter',
        },
        {
          id: 'todo_acq_2',
          type: 'question',
          content: 'What is your maximum offer price?',
          status: answers.max_offer_price ? 'completed' : 'pending',
          due_date: formatDueDate(2),
          phase: 'acquisition',
          action_label: 'Set Offer Cap',
        },
        {
          id: 'todo_acq_3',
          type: 'task',
          content: 'Find a Real Estate Attorney for closing',
          assigned_to: answers.attorney_user_id || undefined,
          status: answers.attorney_user_id ? 'completed' : 'pending',
          due_date: formatDueDate(7),
          phase: 'acquisition',
          action_label: 'Assign Legal Counsel',
        },
        {
          id: 'todo_acq_4',
          type: 'task',
          content: 'Generate Draft Offer Letter (triggers Document Automation)',
          status: answers.offer_letter_doc ? 'completed' : 'pending',
          due_date: formatDueDate(5),
          phase: 'acquisition',
          action_label: 'Generate Offer',
        },
      ];

    case 'purchase':
      return [
        {
          id: 'todo_pur_1',
          type: 'file',
          content: 'Upload signed Purchase & Sale Agreement',
          status: answers.purchase_contract_doc ? 'completed' : 'pending',
          due_date: formatDueDate(1),
          phase: 'purchase',
          action_label: 'Upload PSA',
        },
        {
          id: 'todo_pur_2',
          type: 'task',
          content: 'Confirm Earnest Money Deposit wired to escrow',
          status: answers.earnest_money_amount ? 'completed' : 'pending',
          due_date: formatDueDate(3),
          phase: 'purchase',
          action_label: 'Confirm EMD',
        },
        {
          id: 'todo_pur_3',
          type: 'file',
          content: 'Review and approve Title Search Report',
          status: answers.title_search_doc ? 'completed' : 'pending',
          due_date: formatDueDate(10),
          phase: 'purchase',
          action_label: 'Review Title',
        },
        {
          id: 'todo_pur_4',
          type: 'file',
          content: 'Upload Lender Loan Commitment Letter',
          status: answers.lender_commitment_doc ? 'completed' : 'pending',
          due_date: formatDueDate(14),
          phase: 'purchase',
          action_label: 'Upload Commitment',
        },
      ];

    case 'hold':
      return [
        {
          id: 'todo_hld_1',
          type: 'task',
          content: 'Assign General Contractor for Rehab Scope of Work',
          assigned_to: answers.gc_vendor_id || undefined,
          status: answers.gc_vendor_id ? 'completed' : 'pending',
          due_date: formatDueDate(5),
          phase: 'hold',
          action_label: 'Assign GC',
        },
        {
          id: 'todo_hld_2',
          type: 'file',
          content: 'Upload Active Property & Liability Insurance Policy',
          status: answers.insurance_policy_doc ? 'completed' : 'pending',
          due_date: formatDueDate(2),
          phase: 'hold',
          action_label: 'Upload Insurance',
        },
        {
          id: 'todo_hld_3',
          type: 'file',
          content: 'Upload Executed Tenant Lease Agreement',
          status: answers.lease_agreement_doc ? 'completed' : 'pending',
          due_date: formatDueDate(30),
          phase: 'hold',
          action_label: 'Upload Lease',
        },
        {
          id: 'todo_hld_4',
          type: 'question',
          content: 'Set initial monthly rent and operating reserve target',
          status: answers.monthly_rent ? 'completed' : 'pending',
          due_date: formatDueDate(7),
          phase: 'hold',
          action_label: 'Configure Reserve',
        },
      ];

    case 'exit':
      return [
        {
          id: 'todo_ext_1',
          type: 'file',
          content: 'Upload Listing Broker Representation Agreement',
          status: answers.listing_agreement_doc ? 'completed' : 'pending',
          due_date: formatDueDate(3),
          phase: 'exit',
          action_label: 'Upload Agreement',
        },
        {
          id: 'todo_ext_2',
          type: 'question',
          content: 'What is the Final Agreed Exit Sale Price?',
          status: answers.exit_sale_price ? 'completed' : 'pending',
          due_date: formatDueDate(15),
          phase: 'exit',
          action_label: 'Enter Sale Price',
        },
        {
          id: 'todo_ext_3',
          type: 'file',
          content: 'Upload IRS Form 1099-S / Final Closing Settlement Statement',
          status: answers.form_1099s_doc ? 'completed' : 'pending',
          due_date: formatDueDate(20),
          phase: 'exit',
          action_label: 'Upload 1099-S',
        },
        {
          id: 'todo_ext_4',
          type: 'task',
          content: 'Calculate Schedule D Capital Gains & 1031 Exchange Eligibility',
          status: answers.cap_gains_calculated ? 'completed' : 'pending',
          due_date: formatDueDate(25),
          phase: 'exit',
          action_label: 'Run 1031 Check',
        },
      ];
  }
}

/**
 * Calculates phase completion percentage (0 - 100) based on checklist & todo completion.
 */
export function calculatePhaseCompletion(
  todos: TodoItem[],
  answeredFieldsCount: number = 0,
  totalPhaseFieldsCount: number = 5
): number {
  if (todos.length === 0 && totalPhaseFieldsCount === 0) return 0;

  const completedTodos = todos.filter(t => t.status === 'completed').length;
  const totalTodos = todos.length;

  const totalItems = totalTodos + totalPhaseFieldsCount;
  const completedItems = completedTodos + Math.min(answeredFieldsCount, totalPhaseFieldsCount);

  if (totalItems === 0) return 0;
  return Math.min(100, Math.round((completedItems / totalItems) * 100));
}
