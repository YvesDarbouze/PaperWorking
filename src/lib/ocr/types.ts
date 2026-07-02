/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — OCR Pipeline Types
 *
 * Shared type definitions for the document OCR extraction
 * pipeline, including extracted field structure, confidence
 * tiers, and document type mappings.
 *
 * @module lib/ocr/types
 * ═══════════════════════════════════════════════════════
 */

// ── Document Types for OCR ──────────────────────────────

/**
 * Document types that the OCR pipeline can process.
 * Each type maps to a different set of extractable fields.
 */
export type OcrDocumentType =
  | 'closing_disclosure'
  | 'receipt'
  | 'lease'
  | 'inspection'
  | 'appraisal'
  | 'contractor_bid'
  | 'title_report'
  | 'other';

// ── Extracted Field Structure ───────────────────────────

/**
 * A single extracted field from OCR processing.
 *
 * Confidence tiers:
 *   ≥ 0.95 → GREEN  — auto-prefill, one-click confirm
 *   0.70–0.94 → AMBER — prefill with review flag
 *   < 0.70 → RED — no prefill, hint only
 */
export interface ExtractedField {
  /** The extracted value (string, number, or date string) */
  value: string | number | null;
  /** OCR confidence score from 0.0 to 1.0 */
  confidence: number;
  /** Whether the user has confirmed this value */
  confirmed: boolean;
  /** Original raw text from the document (for user reference) */
  sourceText?: string;
}

/** A map of field names to their extracted values */
export type ExtractedFields = Record<string, ExtractedField>;

// ── Confidence Tiers ────────────────────────────────────

export type ConfidenceTier = 'green' | 'amber' | 'red';

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.95) return 'green';
  if (confidence >= 0.70) return 'amber';
  return 'red';
}

// ── OCR Processing Result ───────────────────────────────

export interface OcrProcessingResult {
  /** Whether the OCR processing succeeded */
  success: boolean;
  /** Extracted fields (empty on failure) */
  extractedFields: ExtractedFields;
  /** Overall confidence score (average of all fields) */
  overallConfidence: number;
  /** Error message on failure */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

// ── Previous Extraction (for re-OCR archival) ───────────

export interface ArchivedExtraction {
  extractedFields: ExtractedFields;
  overallConfidence: number;
  processedAt: string; // ISO date string
  archivedAt: string;  // ISO date string
}

// ── Field Maps per Document Type ────────────────────────

/**
 * Expected fields for each document type.
 * Used by the stub processor and for UI rendering.
 */
export const DOCUMENT_TYPE_FIELDS: Record<OcrDocumentType, string[]> = {
  closing_disclosure: [
    'purchasePrice',
    'loanAmount',
    'interestRate',
    'loanTerm',
    'closingCosts',
    'monthlyPayment',
    'closingDate',
    'propertyAddress',
    'borrowerName',
    'lenderName',
  ],
  receipt: [
    'vendor',
    'amount',
    'date',
    'category',
    'description',
    'paymentMethod',
  ],
  lease: [
    'tenantName',
    'startDate',
    'endDate',
    'monthlyRent',
    'securityDeposit',
    'propertyAddress',
    'landlordName',
  ],
  inspection: [
    'inspectorName',
    'inspectionDate',
    'propertyAddress',
    'overallCondition',
    'majorFindings',
    'estimatedRepairCost',
  ],
  appraisal: [
    'appraiserName',
    'appraisalDate',
    'propertyAddress',
    'appraised_value',
    'comparablesSummary',
  ],
  contractor_bid: [
    'contractorName',
    'bidDate',
    'totalAmount',
    'laborCost',
    'materialsCost',
    'scopeOfWork',
  ],
  title_report: [
    'propertyAddress',
    'ownerName',
    'lienAmount',
    'encumbrances',
    'titleCompany',
    'effectiveDate',
  ],
  other: [
    'documentTitle',
    'date',
    'summary',
  ],
};
