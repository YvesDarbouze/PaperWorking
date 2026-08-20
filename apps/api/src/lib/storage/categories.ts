export type DocumentCategory = 'acquisition' | 'purchase' | 'hold' | 'exit' | 'tax' | 'general';

export const DOCUMENT_CATEGORIES: Record<
  DocumentCategory,
  { label: string; tags: string[]; description: string }
> = {
  acquisition: {
    label: 'Acquisition & Sourcing',
    tags: ['proof_of_funds', 'offer_letters', 'contracts'],
    description: 'POF letters, purchase offers, seller disclosures, deal contracts',
  },
  purchase: {
    label: 'Purchase & Closing',
    tags: ['loan_docs', 'title_docs', 'inspection_reports', 'closing_disclosure'],
    description: 'Mortgage agreements, title policies, inspection reports, Closing Disclosure (CD)',
  },
  hold: {
    label: 'Hold & Operations',
    tags: ['rehab_receipts', 'rental_lease', 'insurance_docs', 'utility_bills'],
    description: 'Rehab invoices, contractor receipts, tenant lease contracts, insurance policies',
  },
  exit: {
    label: 'Exit & Disposition',
    tags: ['marketing_receipts', 'sale_contract', 'closing_docs'],
    description: 'Staging receipts, marketing spend invoices, sale PSA, 1099-S forms',
  },
  tax: {
    label: 'Tax & IRS Records',
    tags: ['generated_forms', 'receipts', '1099s_received'],
    description: 'Form 1040-ES, Schedule E, Form 4562, Schedule D, Form 8825, 1099-NEC',
  },
  general: {
    label: 'General Documents',
    tags: ['other'],
    description: 'Miscellaneous project notes and general correspondence',
  },
};

export function getCategoryByFilename(filename: string): DocumentCategory {
  const lower = filename.toLowerCase();
  if (lower.includes('pof') || lower.includes('proof_of_funds') || lower.includes('offer')) {
    return 'acquisition';
  }
  if (
    lower.includes('loan') ||
    lower.includes('title') ||
    lower.includes('closing_disclosure') ||
    lower.includes('inspection')
  ) {
    return 'purchase';
  }
  if (
    lower.includes('rehab') ||
    lower.includes('receipt') ||
    lower.includes('lease') ||
    lower.includes('utility')
  ) {
    return 'hold';
  }
  if (lower.includes('sale') || lower.includes('marketing') || lower.includes('staging')) {
    return 'exit';
  }
  if (
    lower.includes('irs') ||
    lower.includes('1040') ||
    lower.includes('schedule') ||
    lower.includes('1099') ||
    lower.includes('tax')
  ) {
    return 'tax';
  }
  return 'general';
}
