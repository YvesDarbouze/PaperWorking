import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const { default: MarketingHeader } = await import('../../components/marketing/MarketingHeader.js');
const { default: LandingHero } = await import('../../components/marketing/LandingHero.js');
const { default: DealCalculatorSection } = await import('../../sections/DealCalculatorSection.js');

describe('Mission Verification — Negative assertions for legacy Deal Analyzer graphic relocation to Deal Calculator Section', () => {
  describe('1. Top Header & Hero Area Reflow', () => {
    it('ensures MarketingHeader contains zero trace of the Deal Analyzer graphic or image tags', () => {
      const headerHtml = renderToString(<MarketingHeader />);
      expect(headerHtml).not.toContain('deal-calculator-preview');
      expect(headerHtml).not.toContain('DEAL ANALYZER');
      expect(headerHtml).not.toContain('Deal Analyzer');
      expect(headerHtml).not.toContain('1247 Elm Street');
      expect(headerHtml).not.toContain('alt="PaperWorking Deal Calculator');
    });

    it('ensures LandingHero contains zero legacy Deal Analyzer card or image references', () => {
      const heroHtml = renderToString(<LandingHero />);
      expect(heroHtml).not.toContain('deal-calculator-preview');
      expect(heroHtml).not.toContain('DEAL ANALYZER');
      expect(heroHtml).not.toContain('1247 Elm Street');
    });
  });

  describe('2. Deal Calculator Section Graphic Placement & Attributes', () => {
    const sectionHtml = renderToString(<DealCalculatorSection />);

    it('renders the Deal Calculator section with id="deal-calculator"', () => {
      expect(sectionHtml).toContain('id="deal-calculator"');
    });

    it('displays the graphic with the exact required alt text', () => {
      expect(sectionHtml).toContain(
        'alt="PaperWorking Deal Calculator — projected cap rate, IRR and cash-on-cash"'
      );
    });

    it('references the real high-resolution graphic asset /images/deal-calculator-preview.png', () => {
      expect(sectionHtml).toContain('deal-calculator-preview.png');
    });

    it('applies responsive container styling and layout alignments', () => {
      expect(sectionHtml).toContain('grid-cols-1');
      expect(sectionHtml).toContain('lg:grid-cols-2');
      expect(sectionHtml).toContain('max-w-[540px]');
    });

    it('renders sample underwriting data attributes for accessibility and consistency', () => {
      expect(sectionHtml).toContain('1247 Elm Street, Austin TX');
      expect(sectionHtml).toContain('$485,000');
      expect(sectionHtml).toContain('$620,000');
      expect(sectionHtml).toContain('$68,000');
      expect(sectionHtml).toContain('6.2%');
      expect(sectionHtml).toContain('24.8%');
      expect(sectionHtml).toContain('Confidence');
      expect(sectionHtml).toContain('84%');
      expect(sectionHtml).toContain('Appraisal contingency expires in 3 days');
    });
  });
});
