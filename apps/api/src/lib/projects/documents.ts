export const VENDOR_SLOT_FOLDER_MAPPING: Record<string, string> = {
  f4TitleEscrowVendor: 'Title & Insurance',
  f4ClosingAttorneyVendor: 'Closing',
  f4AppraiserVendor: 'Debt',
  f4EnvironmentalVendor: 'Title & Insurance',
  f4SurveyorVendor: 'Title & Insurance',
  f4InsuranceBrokerVendor: 'Title & Insurance',
  f4CdcVendor: 'Debt',
  f4HardMoneyLenderVendor: 'Debt',
};

export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const VALID_DOCUMENT_TYPES = [
  'closing_disclosure',
  'receipt',
  'lease',
  'inspection',
  'appraisal',
  'contractor_bid',
  'title_report',
  'purchase_agreement',
  'other',
] as const;

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export type DocumentFolder =
  | 'Capital Plan'
  | 'Equity'
  | 'Debt'
  | 'Title & Insurance'
  | 'Closing';

export function getFolderForDocument(doc: {
  folderName?: string;
  documentType?: string;
  category?: string;
  name?: string;
  fileName?: string;
  notes?: string;
  id?: string;
}): DocumentFolder {
  if (doc.folderName) {
    const name = String(doc.folderName).trim();
    if (['Capital Plan', 'Equity', 'Debt', 'Title & Insurance', 'Closing'].includes(name)) {
      return name as DocumentFolder;
    }
  }

  const docType = (doc.documentType || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const name = (doc.name || doc.fileName || '').toLowerCase();
  const notes = (doc.notes || '').toLowerCase();

  if (
    docType === 'appraisal' ||
    category === 'appraisal' ||
    name.includes('appraisal') ||
    name.includes('lender') ||
    name.includes('loan_estimate') ||
    name.includes('loan estimate') ||
    name.includes('debt') ||
    name.includes('commitment') ||
    category === 'debt'
  ) {
    return 'Debt';
  }

  if (
    docType === 'title_report' ||
    category === 'title report' ||
    category === 'inspection report' ||
    docType === 'inspection' ||
    category === 'permit' ||
    docType === 'permit' ||
    name.includes('title') ||
    name.includes('survey') ||
    name.includes('environmental') ||
    name.includes('phase_i') ||
    name.includes('insurance') ||
    name.includes('zoning') ||
    name.includes('hoa') ||
    category === 'title & insurance' ||
    category === 'title search' ||
    category === 'compliance & operations'
  ) {
    return 'Title & Insurance';
  }

  if (
    category === 'equity' ||
    category === 'subscription' ||
    doc.id?.startsWith('sub_agreement_') ||
    name.includes('subscription') ||
    name.includes('partnership')
  ) {
    return 'Equity';
  }

  if (
    category === 'capital plan' ||
    category === 'proof of funds' ||
    notes.includes('capital stack') ||
    name.includes('capital-stack') ||
    name.includes('proof-of-funds') ||
    name.includes('capital_stack') ||
    category === 'proof_of_funds'
  ) {
    return 'Capital Plan';
  }

  return 'Closing';
}

export function getPhaseForDocument(doc: {
  phase?: string;
  documentType?: string;
  category?: string;
  name?: string;
  fileName?: string;
}): 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'founder_review' {
  if (doc.phase && ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'founder_review'].includes(doc.phase)) {
    return doc.phase as 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4' | 'founder_review';
  }

  const docType = (doc.documentType || '').toLowerCase();
  const category = (doc.category || '').toLowerCase();
  const name = (doc.name || doc.fileName || '').toLowerCase();

  if (
    category === 'loi' ||
    docType === 'loi' ||
    category === 'purchase agreement' ||
    docType === 'purchase_agreement' ||
    name.includes('loi') ||
    name.includes('psa') ||
    name.includes('purchase_agreement') ||
    name.includes('emd') ||
    name.includes('due_diligence')
  ) {
    return 'phase-1';
  }

  if (
    category === 'contractor bid' ||
    name.includes('rehab') ||
    name.includes('bid') ||
    name.includes('invoice') ||
    name.includes('lease') ||
    name.includes('tenant') ||
    name.includes('rent_roll')
  ) {
    return 'phase-3';
  }

  if (name.includes('taxpacket') || name.includes('sold') || name.includes('exit_waterfall')) {
    return 'phase-4';
  }

  return 'phase-2';
}

export function validateDocumentUpload(input: {
  mimeType: string;
  sizeBytes: number;
  documentType: string;
}): { ok: true } | { ok: false; error: string; status: number } {
  if (!(ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(input.mimeType)) {
    return {
      ok: false,
      error: `Unsupported file type "${input.mimeType}". Accepted: ${ALLOWED_DOCUMENT_MIMES.join(', ')}`,
      status: 415,
    };
  }

  if (input.sizeBytes > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      error: `File exceeds 25 MB limit (${(input.sizeBytes / 1024 / 1024).toFixed(1)} MB)`,
      status: 413,
    };
  }

  if (!(VALID_DOCUMENT_TYPES as readonly string[]).includes(input.documentType)) {
    return {
      ok: false,
      error: `Invalid documentType "${input.documentType}". Valid: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      status: 400,
    };
  }

  return { ok: true };
}

export function buildDocumentDownloadPath(projectId: string, docId: string): string {
  return `/api/projects/${projectId}/documents/${docId}/download`;
}

export function sanitizeDocumentFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
