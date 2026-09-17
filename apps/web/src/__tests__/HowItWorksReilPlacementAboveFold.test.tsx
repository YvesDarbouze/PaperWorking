import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorks from '../../components/marketing/HowItWorks.js';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import ReilLifecycleCards, { REIL_LIFECYCLE_PHASES } from '../../components/marketing/ReilLifecycleCards.js';

function decodeHtml(html: string) {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

describe('How It Works — REIL 4-Phase Placement Above the Fold', () => {
  const howItWorksHtml = renderToString(<HowItWorks />);
  const decodedHowItWorks = decodeHtml(howItWorksHtml);

  const headerHtml = renderToString(<HowItWorksHeader />);
  const decodedHeader = decodeHtml(headerHtml);

  const cardsHtml = renderToString(<ReilLifecycleCards />);
  const decodedCards = decodeHtml(cardsHtml);

  describe('1. Exact Structure and Verbatim Copy', () => {
    it('renders the exact eyebrow/headline in HowItWorks and ReilLifecycleCards', () => {
      const expectedEyebrow = 'BUILT ON THE REAL ESTATE INVESTMENT LIFE CYCLE';
      expect(decodedCards).toContain(expectedEyebrow);
      expect(decodedHowItWorks).toContain(expectedEyebrow);
      expect(decodedHeader).toContain(expectedEyebrow);
    });

    it('renders the exact subheadline in HowItWorks and ReilLifecycleCards', () => {
      const expectedSub = 'Acquisition, Fund, Hold, Exit. Four phases. One system.';
      expect(decodedCards).toContain(expectedSub);
      expect(decodedHowItWorks).toContain(expectedSub);
      expect(decodedHeader).toContain(expectedSub);
    });

    it('renders PHASE 01 — Acquisition with exact verbatim copy', () => {
      const expectedPhase1 =
        'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.';
      expect(decodedCards).toContain('PHASE 01');
      expect(decodedCards).toContain('Acquisition');
      expect(decodedCards).toContain(expectedPhase1);
      expect(decodedHowItWorks).toContain(expectedPhase1);
    });

    it('renders PHASE 02 — Fund with exact verbatim copy', () => {
      const expectedPhase2 =
        'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.';
      expect(decodedCards).toContain('PHASE 02');
      expect(decodedCards).toContain('Fund');
      expect(decodedCards).toContain(expectedPhase2);
      expect(decodedHowItWorks).toContain(expectedPhase2);
    });

    it('renders PHASE 03 — Hold with exact verbatim copy', () => {
      const expectedPhase3 =
        'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.';
      expect(decodedCards).toContain('PHASE 03');
      expect(decodedCards).toContain('Hold');
      expect(decodedCards).toContain(expectedPhase3);
      expect(decodedHowItWorks).toContain(expectedPhase3);
    });

    it('renders PHASE 04 — Exit with exact verbatim copy', () => {
      const expectedPhase4 =
        'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.';
      expect(decodedCards).toContain('PHASE 04');
      expect(decodedCards).toContain('Exit');
      expect(decodedCards).toContain(expectedPhase4);
      expect(decodedHowItWorks).toContain(expectedPhase4);
    });
  });

  describe('2. Deduplication Proof — Exactly Once on /how-it-works', () => {
    it('ensures each phase summary copy string appears strictly once on the How It Works page', () => {
      for (const phase of REIL_LIFECYCLE_PHASES) {
        // Count occurrences in decodedHowItWorks
        const occurrences = decodedHowItWorks.split(phase.copy).length - 1;
        expect(occurrences).toBe(1);
      }
    });

    it('ensures no duplicate phase 01-04 summary sentences exist in deep-dive workflows lower on the page', () => {
      const deepDiveIndex = decodedHowItWorks.indexOf('Inside each phase of your deal');
      expect(deepDiveIndex).toBeGreaterThan(-1);

      const deepDiveSlice = decodedHowItWorks.slice(deepDiveIndex);
      for (const phase of REIL_LIFECYCLE_PHASES) {
        expect(deepDiveSlice).not.toContain(phase.copy);
      }
    });
  });

  describe('3. Placement Directly Underneath Header Text (Above the Fold DOM Order)', () => {
    it('places ReilLifecycleCards directly following the primary h1 headline in HowItWorks', () => {
      const h1EndIndex = decodedHowItWorks.indexOf('</h1>');
      const cardsStartIndex = decodedHowItWorks.indexOf('data-testid="reil-lifecycle-cards"');
      const narrativeIndex = decodedHowItWorks.indexOf('The Real Estate Investment Lifecycle (REIL) is a system');

      expect(h1EndIndex).toBeGreaterThan(-1);
      expect(cardsStartIndex).toBeGreaterThan(h1EndIndex);
      // REIL 4-phase cards must precede the narrative block
      expect(narrativeIndex).toBeGreaterThan(cardsStartIndex);
    });

    it('places ReilLifecycleCards directly following the h2 headline in HowItWorksHeader', () => {
      const h2EndIndex = decodedHeader.indexOf('</h2>');
      const cardsStartIndex = decodedHeader.indexOf('data-testid="reil-lifecycle-cards"');
      const narrativeIndex = decodedHeader.indexOf('The Real Estate Investment Lifecycle (REIL) is a system');

      expect(h2EndIndex).toBeGreaterThan(-1);
      expect(cardsStartIndex).toBeGreaterThan(h2EndIndex);
      expect(narrativeIndex).toBeGreaterThan(cardsStartIndex);
    });
  });

  describe('4. Responsive Styling Structure', () => {
    it('uses responsive 1-column mobile, 2-column tablet, and 4-column desktop grid', () => {
      expect(cardsHtml).toContain('grid-cols-1');
      expect(cardsHtml).toContain('md:grid-cols-2');
      expect(cardsHtml).toContain('lg:grid-cols-4');
    });

    it('applies design system typography and emerald accent colors', () => {
      expect(cardsHtml).toContain('text-[#00DD94]');
      expect(cardsHtml).toContain('font-[family-name:var(--font-jetbrains-mono)]');
    });
  });
});
