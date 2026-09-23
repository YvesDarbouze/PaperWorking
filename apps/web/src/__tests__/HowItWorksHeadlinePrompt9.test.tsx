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

  describe('2. Exact Client Copy Locked in the Copy Module', () => {
    it('matches exact string "How the Real Estate Investment Lifecycle Works."', () => {
      expect(howItWorksSubheadline).toBe('How the Real Estate Investment Lifecycle Works.');
    });

    it('does not render the headline on either How-It-Works surface (client removed it)', () => {
      expect(headerHtml).not.toContain('How the Real Estate Investment Lifecycle Works.');
      expect(howItWorksHtml).not.toContain('How the Real Estate Investment Lifecycle Works.');
    });
  });
});
