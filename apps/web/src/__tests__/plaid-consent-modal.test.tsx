import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { PlaidConsentModal } from '../../components/plaid/PlaidConsentModal.js';

describe('Plaid Bank Connection Consent Modal (Review C3.3)', () => {
  it('renders Plaid consent modal with statutory disclosures when open', () => {
    const html = renderToString(
      <PlaidConsentModal
        isOpen={true}
        onClose={() => {}}
        onConsentConfirmed={() => {}}
        institutionName="Chase Bank"
      />,
    );

    expect(html).toContain('data-testid="plaid-consent-modal"');
    expect(html).toContain('Plaid Technologies, Inc.');
    expect(html).toContain('Account balances, account numbers, transactions, and mortgage liabilities');
    expect(html).toContain('AES-256-GCM');
    expect(html).toContain('data-testid="plaid-privacy-policy-link"');
    expect(html).toContain('https://plaid.com/legal/#end-user-privacy-policy');
    expect(html).toContain('data-testid="plaid-consent-checkbox"');
    expect(html).toContain('data-testid="plaid-consent-confirm-btn"');
    expect(html).toContain('Authorize &amp; Connect');
  });

  it('renders re-authentication title in update mode', () => {
    const html = renderToString(
      <PlaidConsentModal
        isOpen={true}
        onClose={() => {}}
        onConsentConfirmed={() => {}}
        institutionName="Wells Fargo"
        isUpdateMode={true}
      />,
    );

    expect(html).toContain('Re-authenticate Bank Connection');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <PlaidConsentModal
        isOpen={false}
        onClose={() => {}}
        onConsentConfirmed={() => {}}
      />,
    );

    expect(html).toBe('');
  });
});
