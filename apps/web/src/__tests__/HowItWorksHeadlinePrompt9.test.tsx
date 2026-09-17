import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import HowItWorks from '../../components/marketing/HowItWorks.js';
import { howItWorksSubheadline } from '../../lib/marketing/copy.js';

describe('PROMPT 9 — Retitle the Section Headline', () => {
  const headerHtml = renderToString(<HowItWorksHeader />);
  const howItWorksHtml = renderToString(<HowItWorks />);

  const legacyHeadline = [
    'How',
    'PaperWorking',
    'Works:',
    'The',
    'Work',
    'You',
    'Do',
    'Becomes',
    'the',
    'Numbers',
    'You',
    'Need',
  ].join(' ');

  describe('1. Removal of Legacy Headline Copy', () => {
    it('contains no legacy headline anywhere in components or copy constants', () => {
      expect(headerHtml).not.toContain(legacyHeadline);
      expect(howItWorksHtml).not.toContain(legacyHeadline);
      expect(howItWorksSubheadline).not.toContain(legacyHeadline);
      expect(headerHtml).not.toContain(['How', 'PaperWorking', 'Works'].join(' '));
      expect(howItWorksHtml).not.toContain(['How', 'PaperWorking', 'Works'].join(' '));
    });
  });

  describe('2. Exact Client Copy with Trailing Period', () => {
    it('matches exact string "How the Real Estate Investment Lifecycle Works."', () => {
      expect(howItWorksSubheadline).toBe('How the Real Estate Investment Lifecycle Works.');
      expect(headerHtml).toContain('How the Real Estate Investment Lifecycle Works.');
      expect(howItWorksHtml).toContain('How the Real Estate Investment Lifecycle Works.');
    });
  });

  describe('3. Structural Position & Typographic Hierarchy', () => {
    it('places the headline directly beneath the kicker in HowItWorksHeader', () => {
      const kickerPos = headerHtml.indexOf(
        'Project Management software made specifically for real estate investor.'
      );
      const headlinePos = headerHtml.indexOf(
        'How the Real Estate Investment Lifecycle Works.'
      );

      expect(kickerPos).toBeGreaterThan(-1);
      expect(headlinePos).toBeGreaterThan(kickerPos);
    });

    it('renders headline as a high-contrast heading element (h2 in landing section, h1 on dedicated page)', () => {
      expect(headerHtml).toContain('<h2 class="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">');
      expect(howItWorksHtml).toContain('<h1 class="landing-display mx-auto mb-6 max-w-4xl font-semibold leading-[1.1] tracking-[-0.025em] text-white">');
    });
  });
});
