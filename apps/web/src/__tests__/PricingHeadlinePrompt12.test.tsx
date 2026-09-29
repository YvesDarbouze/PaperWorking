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
const {
  pricingHeader,
  pricingPositioningHeadline,
  pricingSubheadline,
  pricingBody,
} = await import('../../lib/marketing/copy.js');

describe('Pricing Page Authoritative Copy & SaaS UX Strategy', () => {
  const html = renderToString(<PricingSection />);

  describe('1. Copy Verification', () => {
    it('defines pricingHeader as "PRICING"', () => {
      expect(pricingHeader).toBe('PRICING');
    });

    it('renders exact heading "PRICING"', () => {
      expect(html).toContain('PRICING');
    });

    it('defines and renders exact positioning headline "The Bloomberg Terminal for Real Estate Investors"', () => {
      expect(pricingPositioningHeadline).toBe('The Bloomberg Terminal for Real Estate Investors');
      expect(html).toContain('The Bloomberg Terminal for Real Estate Investors');
    });

    it('defines and renders exact stock trade comparison subheadline', () => {
      expect(pricingSubheadline).toBe(
        'The average stock trade is $5,000. The average real estate deal is $429,000. Why do stock traders have better technology?'
      );
      expect(html).toContain(
        'The average stock trade is $5,000. The average real estate deal is $429,000. Why do stock traders have better technology?'
      );
    });

    it('defines and renders exact fraction of a percent body copy', () => {
      expect(pricingBody).toBe(
        'Being off by even a fraction of a percent can cost thousands of dollars to poor planning, surprise expenses, and avoidable mistakes. PaperWorking gives real estate investors the clarity and the network to make smart, profitable decisions.'
      );
      expect(html).toContain(
        'Being off by even a fraction of a percent can cost thousands of dollars to poor planning, surprise expenses, and avoidable mistakes. PaperWorking gives real estate investors the clarity and the network to make smart, profitable decisions.'
      );
    });

    it('contains no legacy pricing copy anywhere in rendered markup', () => {
      const legacyPricing = ['REAL', 'ESTATE', 'BLOOMBERG', 'TERMINAL'].join(' ');
      expect(html).not.toContain(legacyPricing);
    });
  });

  describe('2. Typographic Hierarchy & Styling', () => {
    it('renders the header inside an <h1> tag with expected typography classes', () => {
      expect(html).toMatch(/<h1[^>]*landing-display[^>]*>[\s\S]*?PRICING[\s\S]*?<\/h1>/);
      expect(html).toContain('uppercase');
    });

    it('renders the positioning headline inside an <h2> tag', () => {
      expect(html).toMatch(/<h2[^>]*>[\s\S]*?The Bloomberg Terminal for Real Estate Investors[\s\S]*?<\/h2>/);
    });
  });

  describe('3. SaaS Pricing UX Strategy & Layout Integrity', () => {
    it('retains billing interval radio group and plan cards without disruption', () => {
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Billing cycle options"');
      expect(html).toContain('Investor');
      expect(html).toContain('Investment Team');
      expect(html).toContain('Vendor');
    });

    it('includes direct API integration trust proof points', () => {
      expect(html).toContain('Plaid');
      expect(html).toContain('DocuSign');
      expect(html).toContain('RentCast');
    });

    it('includes zero-risk guarantee and FAQ sections', () => {
      expect(html).toContain('14-Day Full Access');
      expect(html).toContain('Zero Data Lock-In');
      expect(html).toContain('Frequently Asked Questions');
    });
  });
});
