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

  describe('2. Exact Client Copy as Specified', () => {
    it('matches exact string "Project Management software made specifically for real estate investor."', () => {
      expect(howItWorksHeader).toBe(expectedCopy);
      expect(html).toContain(expectedCopy);
    });
  });

  describe('3. Structural Position & Styling', () => {
    it('places the kicker immediately above the section headline in reading order', () => {
      const kickerIndex = html.indexOf(expectedCopy);
      const headlineIndex = html.indexOf(
        'How the Real Estate Investment Lifecycle Works.'
      );

      expect(kickerIndex).toBeGreaterThan(-1);
      expect(headlineIndex).toBeGreaterThan(kickerIndex);
    });

    it('applies standard section eyebrow styling (uppercase, jetbrains mono, emerald accent)', () => {
      expect(html).toContain('font-[family-name:var(--font-jetbrains-mono)]');
      expect(html).toContain('uppercase');
      expect(html).toContain('text-[#00DD94]');
    });
  });
});
