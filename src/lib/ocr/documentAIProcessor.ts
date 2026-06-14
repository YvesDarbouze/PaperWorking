/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Document AI Processor (Stub)
 *
 * Processes uploaded documents through OCR and extracts
 * structured fields based on the document type.
 *
 * ┌──────────────────────────────────────────────────────┐
 * │ TODO: Replace stub with real Google Document AI call │
 * │                                                      │
 * │ When ready:                                          │
 * │   1. Install @google-cloud/documentai               │
 * │   2. Set GOOGLE_DOCUMENT_AI_PROCESSOR_ID env var     │
 * │   3. Set GOOGLE_CLOUD_PROJECT env var                │
 * │   4. Replace processDocument() body below            │
 * │                                                      │
 * │ Example real implementation:                         │
 * │   const client = new DocumentProcessorServiceClient()│
 * │   const [result] = await client.processDocument({   │
 * │     name: processorName,                             │
 * │     rawDocument: { content: base64, mimeType }       │
 * │   });                                                │
 * │   // Parse result.document.entities into our format  │
 * └──────────────────────────────────────────────────────┘
 *
 * @module lib/ocr/documentAIProcessor
 * ═══════════════════════════════════════════════════════
 */

import type { OcrDocumentType, ExtractedFields, OcrProcessingResult } from './types';

/**
 * Process a document and extract structured fields.
 *
 * Currently returns STUBBED data with realistic confidence scores.
 * The stub simulates varying confidence levels to exercise the
 * full confirm-and-harden UI flow.
 *
 * @param _storagePath  Firebase Storage path to the document
 * @param documentType  The type of document being processed
 * @param _mimeType     MIME type of the document
 * @returns             Extracted fields with confidence scores
 */
export async function processDocument(
  _storagePath: string,
  documentType: OcrDocumentType,
  _mimeType: string = 'application/pdf'
): Promise<OcrProcessingResult> {
  const startTime = Date.now();

  // Return honest coming soon failure
  return {
    success: false,
    extractedFields: {},
    overallConfidence: 0,
    error: 'Google Document AI integration is coming soon.',
    processingTimeMs: Date.now() - startTime,
  };
}

// ── Stub Field Generators ────────────────────────────────

function getStubFields(documentType: OcrDocumentType): ExtractedFields {
  switch (documentType) {
    case 'closing_disclosure':
      return {
        purchasePrice: {
          value: 279000,
          confidence: 0.97,
          confirmed: false,
          sourceText: 'Sale Price: $279,000.00',
        },
        loanAmount: {
          value: 223200,
          confidence: 0.95,
          confirmed: false,
          sourceText: 'Loan Amount: $223,200.00',
        },
        interestRate: {
          value: 7.5,
          confidence: 0.88,
          confirmed: false,
          sourceText: 'Interest Rate: 7.500%',
        },
        loanTerm: {
          value: 360,
          confidence: 0.96,
          confirmed: false,
          sourceText: 'Loan Term: 360 months',
        },
        closingCosts: {
          value: 8450,
          confidence: 0.82,
          confirmed: false,
          sourceText: 'Total Closing Costs: $8,450.00',
        },
        monthlyPayment: {
          value: 1561,
          confidence: 0.91,
          confirmed: false,
          sourceText: 'Monthly Principal & Interest: $1,561.47',
        },
        closingDate: {
          value: '2025-03-15',
          confidence: 0.93,
          confirmed: false,
          sourceText: 'Closing Date: March 15, 2025',
        },
        propertyAddress: {
          value: '1234 Oak Street, Atlanta, GA 30312',
          confidence: 0.98,
          confirmed: false,
          sourceText: 'Property Address: 1234 Oak Street, Atlanta, GA 30312',
        },
        borrowerName: {
          value: 'Jane Investor LLC',
          confidence: 0.94,
          confirmed: false,
          sourceText: 'Borrower: Jane Investor LLC',
        },
        lenderName: {
          value: 'Community First Bank',
          confidence: 0.65,
          confirmed: false,
          sourceText: 'Lender: Comm... First B...',
        },
      };

    case 'receipt':
      return {
        vendor: {
          value: 'Home Depot',
          confidence: 0.96,
          confirmed: false,
          sourceText: 'THE HOME DEPOT #4521',
        },
        amount: {
          value: 347.82,
          confidence: 0.98,
          confirmed: false,
          sourceText: 'TOTAL $347.82',
        },
        date: {
          value: '2025-02-28',
          confidence: 0.92,
          confirmed: false,
          sourceText: '02/28/2025',
        },
        category: {
          value: 'Building Materials',
          confidence: 0.78,
          confirmed: false,
          sourceText: 'LUMBER / HARDWARE',
        },
        description: {
          value: '2x4 lumber, screws, drywall sheets',
          confidence: 0.72,
          confirmed: false,
          sourceText: '2x4x8 SPF STD (12) ... #8 DRYWALL SCREWS ... USG 4x8 DRYWALL',
        },
        paymentMethod: {
          value: 'Visa ending 4821',
          confidence: 0.89,
          confirmed: false,
          sourceText: 'VISA ****4821',
        },
      };

    case 'lease':
      return {
        tenantName: {
          value: 'Robert & Sarah Johnson',
          confidence: 0.94,
          confirmed: false,
          sourceText: 'Tenant(s): Robert Johnson and Sarah Johnson',
        },
        startDate: {
          value: '2025-04-01',
          confidence: 0.97,
          confirmed: false,
          sourceText: 'Lease Commencement: April 1, 2025',
        },
        endDate: {
          value: '2026-03-31',
          confidence: 0.96,
          confirmed: false,
          sourceText: 'Lease Expiration: March 31, 2026',
        },
        monthlyRent: {
          value: 1850,
          confidence: 0.99,
          confirmed: false,
          sourceText: 'Monthly Rent: $1,850.00',
        },
        securityDeposit: {
          value: 1850,
          confidence: 0.85,
          confirmed: false,
          sourceText: 'Security Deposit: One month rent',
        },
        propertyAddress: {
          value: '1234 Oak Street, Unit B, Atlanta, GA 30312',
          confidence: 0.97,
          confirmed: false,
          sourceText: 'Premises: 1234 Oak Street, Unit B, Atlanta, GA 30312',
        },
        landlordName: {
          value: 'Jane Investor LLC',
          confidence: 0.62,
          confirmed: false,
          sourceText: 'Landlord: J... Investor L..',
        },
      };

    case 'inspection':
      return {
        inspectorName: {
          value: 'Mike Rodriguez, CPI',
          confidence: 0.91,
          confirmed: false,
          sourceText: 'Inspector: Mike Rodriguez, Certified Professional Inspector',
        },
        inspectionDate: {
          value: '2025-02-10',
          confidence: 0.95,
          confirmed: false,
          sourceText: 'Inspection Date: February 10, 2025',
        },
        propertyAddress: {
          value: '1234 Oak Street, Atlanta, GA 30312',
          confidence: 0.98,
          confirmed: false,
          sourceText: 'Subject Property: 1234 Oak Street, Atlanta, GA 30312',
        },
        overallCondition: {
          value: 'Fair — Needs moderate repairs',
          confidence: 0.76,
          confirmed: false,
          sourceText: 'Overall Condition: Fair. Multiple items require attention.',
        },
        majorFindings: {
          value: 'Roof replacement needed (15yr+), HVAC compressor failing, foundation crack at NE corner',
          confidence: 0.68,
          confirmed: false,
          sourceText: 'Major Items: Roof... HVAC... foundation...',
        },
        estimatedRepairCost: {
          value: 32000,
          confidence: 0.55,
          confirmed: false,
          sourceText: 'Est. repair costs mentioned: ~$32K',
        },
      };

    case 'appraisal':
      return {
        appraiserName: {
          value: 'David Chen, MAI',
          confidence: 0.92,
          confirmed: false,
        },
        appraisalDate: {
          value: '2025-02-15',
          confidence: 0.96,
          confirmed: false,
        },
        propertyAddress: {
          value: '1234 Oak Street, Atlanta, GA 30312',
          confidence: 0.98,
          confirmed: false,
        },
        appraised_value: {
          value: 285000,
          confidence: 0.94,
          confirmed: false,
          sourceText: 'Appraised Value: $285,000',
        },
        comparablesSummary: {
          value: '3 comps, range $265K-$310K, median $287K',
          confidence: 0.73,
          confirmed: false,
        },
      };

    case 'contractor_bid':
      return {
        contractorName: {
          value: 'Atlanta Renovations LLC',
          confidence: 0.95,
          confirmed: false,
        },
        bidDate: {
          value: '2025-02-20',
          confidence: 0.90,
          confirmed: false,
        },
        totalAmount: {
          value: 45000,
          confidence: 0.97,
          confirmed: false,
        },
        laborCost: {
          value: 28000,
          confidence: 0.82,
          confirmed: false,
        },
        materialsCost: {
          value: 17000,
          confidence: 0.84,
          confirmed: false,
        },
        scopeOfWork: {
          value: 'Full kitchen/bath remodel, roof repair, HVAC replacement',
          confidence: 0.71,
          confirmed: false,
        },
      };

    case 'title_report':
      return {
        propertyAddress: {
          value: '1234 Oak Street, Atlanta, GA 30312',
          confidence: 0.98,
          confirmed: false,
        },
        ownerName: {
          value: 'Previous Owner Trust',
          confidence: 0.88,
          confirmed: false,
        },
        lienAmount: {
          value: 145000,
          confidence: 0.79,
          confirmed: false,
        },
        encumbrances: {
          value: 'Utility easement (SE corner), HOA covenant',
          confidence: 0.65,
          confirmed: false,
        },
        titleCompany: {
          value: 'First American Title',
          confidence: 0.92,
          confirmed: false,
        },
        effectiveDate: {
          value: '2025-02-01',
          confidence: 0.94,
          confirmed: false,
        },
      };

    case 'other':
    default:
      return {
        documentTitle: {
          value: 'Uploaded Document',
          confidence: 0.60,
          confirmed: false,
        },
        date: {
          value: new Date().toISOString().split('T')[0],
          confidence: 0.50,
          confirmed: false,
        },
        summary: {
          value: 'Document content could not be fully classified',
          confidence: 0.40,
          confirmed: false,
        },
      };
  }
}
