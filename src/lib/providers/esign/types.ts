/**
 * E-Signature Provider — Shared Types
 *
 * All adapters (DocuSign, Mock) implement IESignProvider.
 * Consumers only import from this file and from `@/lib/providers/esign/index`.
 */

export type ESignProviderName = 'docusign' | 'mock';

/** Canonical status mirroring schema.ts ESignStatus */
export type EnvelopeStatus =
  | 'sent'       // Envelope created; signers notified
  | 'completed'  // All parties have signed
  | 'declined'   // At least one signer declined
  | 'voided'     // Sender voided before completion
  | 'error';     // Provider error

export interface CreateEnvelopeParams {
  /** Firebase project document ID — persisted to Firestore */
  projectId: string;
  /** Firestore document ID within the project's documents subcollection */
  documentId: string;
  /** Human-readable document label (e.g. "Final Closing Disclosures") */
  documentName: string;
  /** Signer's display role (e.g. "General Contractor") */
  signerRole: string;
  /** Signer's email — required for real adapters; ignored by mock */
  signerEmail: string;
  /** Signer's full name */
  signerName: string;
  /** Firebase Storage download URL for the document to be signed */
  documentUrl: string;
}

export interface CreateEnvelopeResult {
  /** Provider-specific envelope identifier (DocuSign envelopeId, etc.) */
  envelopeId: string;
  /** Redirect URL for embedded signing experience */
  signingUrl?: string;
  /** Current status immediately after creation */
  status: EnvelopeStatus;
  /** ISO timestamp */
  createdAt: string;
}

export interface GetEnvelopeStatusResult {
  envelopeId: string;
  status: EnvelopeStatus;
  /** Set when status === 'completed' */
  completedAt?: string;
  /** Name as entered by the signer */
  signerName?: string;
}

export interface IESignProvider {
  readonly providerName: ESignProviderName;
  createEnvelope(params: CreateEnvelopeParams): Promise<CreateEnvelopeResult>;
  getEnvelopeStatus(envelopeId: string): Promise<GetEnvelopeStatusResult>;
  voidEnvelope(envelopeId: string, reason: string): Promise<void>;
}
