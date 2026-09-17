import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import TermsPage from '../../app/(marketing)/terms/page.js';
import PrivacyPage from '../../app/(marketing)/privacy/page.js';
import MarketingFooter from '../../components/marketing/MarketingFooter.js';
import { LEGAL_DRAFT_NOTICE, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../lib/marketing/legal-data.js';

describe('Legal Pages, Draft Notice & Real Subprocessors (Review C3.1)', () => {
  it('renders prominent DRAFT notice on Terms of Service page', () => {
    const html = renderToString(<TermsPage />);

    expect(html).toContain('data-testid="legal-draft-notice"');
    expect(html).toContain('DRAFT — pending attorney review');
    expect(html).toContain('Terms of Service');
    expect(html).toContain('Financial &amp; Investment Disclaimer');
    expect(html).toContain('hypothetical illustrations based on user-supplied assumptions');
  });

  it('renders prominent DRAFT notice on Privacy Policy page with real data flows', () => {
    const html = renderToString(<PrivacyPage />);

    expect(html).toContain('data-testid="legal-draft-notice"');
    expect(html).toContain('DRAFT — pending attorney review');
    expect(html).toContain('Real Data Flows &amp; Third-Party Subprocessors');

    // Real subprocessors enumerated
    expect(html).toContain('Plaid Technologies, Inc.');
    expect(html).toContain('RentCast');
    expect(html).toContain('Google Maps &amp; Places');
    expect(html).toContain('SendGrid / Twilio');
    expect(html).toContain('Stripe, Inc.');
    expect(html).toContain('Strict Zero SMS Policy');
  });

  it('neutralizes corporate entity name to PaperWorking in MarketingFooter', () => {
    const html = renderToString(<MarketingFooter />);

    expect(html).toContain('© 2026 PaperWorking. All rights reserved.');
    expect(html).not.toContain('PaperWorking Corp.');
    expect(html).not.toContain('PaperWorking LLC');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
  });

  it('validates that legal-data constants accurately reflect platform policy', () => {
    expect(LEGAL_DRAFT_NOTICE).toBe('DRAFT — pending attorney review');
    expect(PRIVACY_SECTIONS.some((s) => s.heading.includes('Real Data Flows'))).toBe(true);
    expect(TERMS_SECTIONS.some((s) => s.heading.includes('Financial & Investment Disclaimer'))).toBe(true);
  });
});
