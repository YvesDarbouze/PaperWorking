import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import LandingHero from '../../components/marketing/LandingHero.js';
import LandingBelowFold from '../../components/marketing/LandingBelowFold.js';

describe('PROMPT 14 — Move the REIL Phase Block Above the Fold', () => {
  const heroHtml = renderToString(<LandingHero />);
  const belowFoldHtml = renderToString(<LandingBelowFold />);

  describe('1. Relocation into Hero & Content Preservation', () => {
    it('renders the complete REIL header and subheadline in LandingHero', () => {
      expect(heroHtml).toContain('Built on the Real Estate Investment Life Cycle');
      expect(heroHtml).toContain('Acquisition, Fund, Hold, Exit. Four phases. One system.');
    });

    it('renders all 4 phase numbers and titles in LandingHero', () => {
      expect(heroHtml).toContain('PHASE 01');
      expect(heroHtml).toContain('Acquisition');
      expect(heroHtml).toContain('PHASE 02');
      expect(heroHtml).toContain('Fund');
      expect(heroHtml).toContain('PHASE 03');
      expect(heroHtml).toContain('Hold');
      expect(heroHtml).toContain('PHASE 04');
      expect(heroHtml).toContain('Exit');
    });

    it('preserves exact, byte-for-byte phase description copy in LandingHero', () => {
      expect(heroHtml).toContain(
        'Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.'
      );
      expect(heroHtml).toContain(
        'Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.'
      );
      expect(heroHtml).toContain(
        'Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.'
      );
      expect(heroHtml).toContain(
        'Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.'
      );
    });
  });

  describe('2. Removal from Original Position (No Duplication / No Empty Gap)', () => {
    it('does not contain the REIL 4-phase block anywhere in LandingBelowFold', () => {
      expect(belowFoldHtml).not.toContain('Built on the Real Estate Investment Life Cycle');
      expect(belowFoldHtml).not.toContain('Four phases. One system.');
      expect(belowFoldHtml).not.toContain('PHASE 01');
      expect(belowFoldHtml).not.toContain('PHASE 02');
      expect(belowFoldHtml).not.toContain('PHASE 03');
      expect(belowFoldHtml).not.toContain('PHASE 04');
    });

    it('preserves other below-fold sections without orphaned dividers', () => {
      expect(belowFoldHtml).toContain('Every deadline tracked. Every dollar logged. Every metric live.');
      expect(belowFoldHtml).toContain('One project record. Thirty-three investor KPIs.');
    });
  });

  describe('3. Ordering, Visual Hierarchy & Coordination with Prompts 7 and 15', () => {
    it('places the REIL phase block directly beneath hero header text and CTAs in DOM order', () => {
      const h1Pos = heroHtml.indexOf('<h1');
      const ctaPos = heroHtml.indexOf('href="/pricing"');
      const reilHeaderPos = heroHtml.indexOf('Built on the Real Estate Investment Life Cycle');
      const visualPos = heroHtml.indexOf('aria-roledescription="carousel"');

      // DOM order: H1 -> CTAs -> REIL block -> Visual (accessible and keyboard natural flow)
      expect(h1Pos).toBeGreaterThan(-1);
      expect(ctaPos).toBeGreaterThan(h1Pos);
      expect(reilHeaderPos).toBeGreaterThan(ctaPos);
      expect(visualPos).toBeGreaterThan(reilHeaderPos);
    });

    it('configures desktop 2-column grid row spanning and mobile stacked ordering', () => {
      expect(heroHtml).toContain('order-1 lg:order-none lg:col-start-1 lg:row-start-1');
      expect(heroHtml).toContain('order-2 lg:order-none lg:col-span-2 lg:row-start-2');
      expect(heroHtml).toContain('order-3 lg:order-none lg:col-start-2 lg:row-start-1');
      expect(heroHtml).toContain('lg:grid-cols-4');
    });

    it('preserves hero CTAs and primary visual without duplication or collision', () => {
      const carouselMatches = heroHtml.match(/aria-roledescription="carousel"/g);
      expect(carouselMatches?.length).toBe(1);
      expect(heroHtml).toContain('Get started');
      expect(heroHtml).toContain('See how it works');
    });
  });
});
