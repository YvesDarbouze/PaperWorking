import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import LandingHero from '../../components/marketing/LandingHero.js';
import HeroProductCarousel from '../../components/marketing/HeroProductCarousel.js';

describe('PROMPT 7 — Hero Visual Beside the Headline', () => {
  const heroHtml = renderToString(<LandingHero />);
  const carouselHtml = renderToString(<HeroProductCarousel />);

  describe('1. Placement & Layout Structure', () => {
    it('renders responsive grid with 2 columns on desktop and 1 column on mobile', () => {
      expect(heroHtml).toContain('grid-cols-1');
      expect(heroHtml).toContain('lg:grid-cols-2');
      expect(heroHtml).toContain('items-center');
    });

    it('places the visual column after the text column in the DOM so it stacks below on mobile', () => {
      const h1Pos = heroHtml.indexOf('<h1');
      const ctaPos = heroHtml.indexOf('href="/pricing"');
      const carouselPos = heroHtml.indexOf('aria-roledescription="carousel"');

      expect(h1Pos).toBeGreaterThan(-1);
      expect(ctaPos).toBeGreaterThan(h1Pos);
      expect(carouselPos).toBeGreaterThan(ctaPos);
    });
  });

  describe('2. Single Primary Visual & Coordination with Prompt 15', () => {
    it('contains exactly ONE hero visual component beside the headline', () => {
      const carouselMatches = heroHtml.match(/aria-roledescription="carousel"/g);
      expect(carouselMatches).not.toBeNull();
      expect(carouselMatches?.length).toBe(1);
    });

    it('contains no competing media, video walls, or legacy Deal Analyzer demo card in hero', () => {
      expect(heroHtml).not.toContain('DEAL ANALYZER');
      expect(heroHtml).not.toContain('1247 Elm Street');
      expect(heroHtml).not.toContain('<video');
      expect(heroHtml).not.toContain('<iframe');
    });
  });

  describe('3. Visual Content Authenticity & Product Vocabulary', () => {
    it('renders authentic investor metrics and REIL lifecycle phases', () => {
      expect(carouselHtml).toContain('NOI (Annual)');
      expect(carouselHtml).toContain('Cap Rate');
      expect(carouselHtml).toContain('DSCR');
      expect(carouselHtml).toContain('Cash-on-Cash');
      expect(carouselHtml).toContain('Projected IRR');
      expect(carouselHtml).toContain('01 Acquisition');
      expect(carouselHtml).toContain('02 Fund (Active)');
      expect(carouselHtml).toContain('03 Hold');
      expect(carouselHtml).toContain('04 Exit');
    });

    it('renders realistic project data with team task assignments', () => {
      expect(carouselHtml).toContain('Oakridge Quadplex');
      expect(carouselHtml).toContain('Track appraisal contingency deadline');
      expect(carouselHtml).toContain('S. Reyes');
      expect(carouselHtml).toContain('M. Okafor');
      expect(carouselHtml).toContain('J. Lindqvist');
    });

    it('renders the on-brand real hero visual asset with explicit dimensions and alt text', () => {
      expect(carouselHtml).toContain('/images/hero-investor-terminal.png');
      expect(carouselHtml).toContain('loading="lazy"');
      expect(carouselHtml).toContain('Finally, Project Management software made for serious real estate investors and Investments teams. — PaperWorking investment terminal');
      expect(carouselHtml).not.toContain('unsplash.com');
      expect(carouselHtml).not.toContain('placeholder');
    });
  });

  describe('4. Accessibility & Meaningful Alt Text', () => {
    it('provides meaningful product preview alt text for screen readers', () => {
      expect(carouselHtml).toContain(
        'Preview of the PaperWorking investment dashboard showing portfolio metrics and deal pipeline.'
      );
    });

    it('implements complete ARIA carousel semantics and live regions', () => {
      expect(carouselHtml).toContain('role="region"');
      expect(carouselHtml).toContain('aria-roledescription="carousel"');
      expect(carouselHtml).toContain('aria-live="polite"');
      expect(carouselHtml).toContain('role="group"');
      expect(carouselHtml).toContain('aria-roledescription="slide"');
      expect(carouselHtml).toContain('aria-label="Previous preview"');
      expect(carouselHtml).toContain('aria-label="Next preview"');
    });
  });

  describe('5. Visual Hierarchy, Sizing & Performance', () => {
    it('maintains clear headline dominance with supporting visual container', () => {
      expect(heroHtml).toContain('<h1 class="text-4xl font-medium tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.05]">');
      expect(heroHtml).toContain('max-w-[620px]');
    });

    it('has reserved container dimensions to prevent layout shifts (CLS = 0)', () => {
      expect(carouselHtml).toContain('min-h-[440px]');
      expect(carouselHtml).toContain('max-w-[620px]');
    });

    it('applies dark-theme styling with subtle emerald accent', () => {
      expect(heroHtml).toContain('bg-[#0a0a0f]');
      expect(carouselHtml).toContain('bg-[#0f111a]');
      expect(carouselHtml).toContain('bg-[#141624]');
      expect(carouselHtml).toContain('var(--color-primary)');
    });
  });

  describe('6. Preserved Hero Copy & Actionable CTAs', () => {
    it('preserves existing hero copy verbatim without alterations', () => {
      expect(heroHtml).toContain(
        'Finally, Project Management software made for serious real estate investors and Investments teams.'
      );
      expect(heroHtml).toContain(
        'The Bloomberg terminal for real estate investors. Track every contingency deadline, underwrite every deal, and manage your projects across Acquisition, Fund, Hold, and Exit.'
      );
      expect(heroHtml).toContain(
        'PaperWorking acts as operational deal insurance for your portfolio.'
      );
    });

    it('renders primary and secondary CTAs above the fold', () => {
      expect(heroHtml).toContain('href="/pricing"');
      expect(heroHtml).toContain('href="#deal-calculator"');
      expect(heroHtml).toContain('Get started');
      expect(heroHtml).toContain('See how it works');
    });
  });
});
