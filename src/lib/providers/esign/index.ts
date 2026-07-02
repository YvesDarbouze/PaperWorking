/**
 * E-Signature Provider — Factory + Public API
 *
 * Select adapter via ESIGN_PROVIDER env var:
 *   ESIGN_PROVIDER=docusign  → DocuSignESignAdapter (requires credentials)
 *   ESIGN_PROVIDER=mock      → MockESignAdapter (default; no credentials needed)
 *
 * Import ONLY from this file in server-side code.
 */

export type { IESignProvider, CreateEnvelopeParams, CreateEnvelopeResult, GetEnvelopeStatusResult, EnvelopeStatus, ESignProviderName } from './types';

export function getESignProvider() {
  const provider = process.env.ESIGN_PROVIDER ?? 'mock';
  if (provider === 'docusign') {
    // Dynamic import keeps DocuSign adapter out of the bundle when not needed
    const { DocuSignESignAdapter } = require('./DocuSignESignAdapter') as typeof import('./DocuSignESignAdapter');
    return new DocuSignESignAdapter();
  }
  const { MockESignAdapter } = require('./MockESignAdapter') as typeof import('./MockESignAdapter');
  return new MockESignAdapter();
}
