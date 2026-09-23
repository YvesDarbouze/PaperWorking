import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import { howItWorksHeader } from '../../lib/marketing/copy.js';

describe('PROMPT 8 — Replace the How-It-Works Kicker Copy', () => {
  const html = renderToString(<HowItWorksHeader />);

  const legacyLabel = ['PORTFOLIO', 'EXECUTION', '&', 'AUTOMATED', 'METRICS'].join(' ');
  const expectedCopy = 'Project Management software made specifically for real estate investor.';

  describe('1. Removal of Legacy Kicker Copy', () => {
    it('contains no legacy portfolio execution label in rendered output or copy constant', () => {
      expect(html).not.toContain(legacyLabel);
      expect(html).not.toContain(['PORTFOLIO', 'EXECUTION'].join(' '));
      expect(howItWorksHeader).not.toContain(['PORTFOLIO', 'EXECUTION'].join(' '));
    });
  });

  describe('2. Exact Client Copy Locked in the Copy Module', () => {
    it('matches exact string "Project Management software made specifically for real estate investor."', () => {
      expect(howItWorksHeader).toBe(expectedCopy);
    });

    it('does not render the kicker on the How-It-Works section (client removed it)', () => {
      expect(html).not.toContain(expectedCopy);
    });
  });

  describe('3. New Direction — Modules Only', () => {
    it('renders the REIL phase modules with no kicker or headline in HowItWorksHeader', () => {
      expect(html).toContain('data-testid="reil-phase-modules"');
      expect(html).not.toContain(expectedCopy);
      expect(html).not.toContain('How the Real Estate Investment Lifecycle Works.');
    });
  });
});
