// Title verification requires a real on-chain provider (e.g., county registry smart contract,
// Propy, or equivalent). No provider is currently configured for PaperWorking.
//
// These stubs exist so any remaining import sites compile during the transition period.
// NEVER generate synthetic hashes — any on-chain reference shown to users must come from
// a real, independently verifiable provider. A provider decision is required before this
// feature can be activated.
//
// Architecture decision: when a provider is selected, implement a TitleVerificationProvider
// interface here (real adapter + mock adapter), key it via TITLE_VERIFICATION_PROVIDER env
// flag, and wire it to /api/closing/title-verify on the server side.

export interface Web3VerificationResult {
  chainOfTitleStatus: 'pending' | 'failed' | 'unavailable';
  blockchainTxHash: null;
  timestamp: string;
  providerDecisionRequired: true;
}

/** No real provider is configured. Never generates a synthetic hash. */
export async function pingDigitalRegistry(
  _propertyAddress: string
): Promise<Web3VerificationResult> {
  return {
    chainOfTitleStatus: 'unavailable',
    blockchainTxHash: null,
    timestamp: new Date().toISOString(),
    providerDecisionRequired: true,
  };
}

export interface DocumentVerificationResult {
  verified: false;
  docHashes: Record<string, never>;
  verificationTxHash: null;
  timestamp: string;
  providerDecisionRequired: true;
}

/** No real provider is configured. Never generates synthetic doc hashes. */
export async function verifyClosingDocuments(
  _projectId: string,
  _documents: {
    titleInsuranceUrl?: string | null;
    closingDisclosureUrl?: string | null;
    wiringInstructionsUrl?: string | null;
  }
): Promise<DocumentVerificationResult> {
  return {
    verified: false,
    docHashes: {},
    verificationTxHash: null,
    timestamp: new Date().toISOString(),
    providerDecisionRequired: true,
  };
}
