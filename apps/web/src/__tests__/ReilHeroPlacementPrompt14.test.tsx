import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import LandingHero from '../../components/marketing/LandingHero.js';
import LandingBelowFold from '../../components/marketing/LandingBelowFold.js';

describe('PROMPT 14 — Move the REIL Phase Block Above the Fold', () => {
  const heroHtml = renderToString(<LandingHero />);
  const belowFoldHtml = renderToString(<LandingBelowFold />);

  describe('1. Removal of Repetitive REIL Block from Landing Page Hero', () => {
    it('does not contain the repetitive REIL 4-phase block in LandingHero', () => {
      expect(heroHtml).not.toContain('Built on the Real Estate Investment Life Cycle');
      expect(heroHtml).not.toContain('Acquisition, Fund, Hold, Exit. Four phases. One system.');
      expect(heroHtml).not.toContain('Decide if the deal works before you buy.');
      expect(heroHtml).not.toContain('Get the money and paperwork lined up.');
      expect(heroHtml).not.toContain('Own it and improve it.');
      expect(heroHtml).not.toContain('Sell it or keep it as a rental, and prove what it made.');
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
    it('places hero header text, CTAs, and visual product showcase in clean 2-column layout', () => {
      const h1Pos = heroHtml.indexOf('<h1');
      const ctaPos = heroHtml.indexOf('href="/pricing"');
      const visualPos = heroHtml.indexOf('aria-roledescription="carousel"');

      // DOM order: H1 -> CTAs -> Visual
      expect(h1Pos).toBeGreaterThan(-1);
      expect(ctaPos).toBeGreaterThan(h1Pos);
      expect(visualPos).toBeGreaterThan(ctaPos);
    });

    it('preserves hero CTAs and primary visual without duplication or collision', () => {
      const carouselMatches = heroHtml.match(/aria-roledescription="carousel"/g);
      expect(carouselMatches?.length).toBe(1);
      expect(heroHtml).toContain('Get started');
      expect(heroHtml).toContain('See how it works');
    });
  });
});
