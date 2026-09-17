import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const { default: PricingSection } = await import(
  '../../components/marketing/PricingSection.js'
);
const { pricingHeader } = await import('../../lib/marketing/copy.js');

describe('PROMPT 12 — Pricing Page Positioning Copy Change', () => {
  const html = renderToString(<PricingSection />);

  describe('1. Copy Verification', () => {
    it('defines pricingHeader as "BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS"', () => {
      expect(pricingHeader).toBe('BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS');
    });

    it('renders exact positioning headline "BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS"', () => {
      expect(html).toContain('BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS');
    });

    it('contains no legacy pricing copy anywhere in rendered markup', () => {
      const legacyPricing = ['REAL', 'ESTATE', 'BLOOMBERG', 'TERMINAL'].join(' ');
      expect(html).not.toContain(legacyPricing);
    });
  });

  describe('2. Typographic Hierarchy & Styling', () => {
    it('renders the positioning headline inside an <h1> tag with expected typography classes', () => {
      // Must maintain h1 level and landing-display styling
      expect(html).toMatch(/<h1[^>]*landing-display[^>]*>[\s\S]*?BLOOMBERG TERMINAL FOR REAL ESTATE INVESTORS[\s\S]*?<\/h1>/);
      expect(html).toContain('uppercase');
    });

    it('preserves the subheadline beneath the headline', () => {
      expect(html).toContain(
        'The average stock trade is $5,000. The average real estate deal is $429,000. Why do stock investors have better fintech apps?'
      );
    });
  });

  describe('3. Surrounding Layout Integrity', () => {
    it('retains billing interval radio group and plan cards without disruption', () => {
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Billing cycle options"');
      expect(html).toContain('Investor');
      expect(html).toContain('Investment Team');
      expect(html).toContain('Vendor');
    });
  });
});
