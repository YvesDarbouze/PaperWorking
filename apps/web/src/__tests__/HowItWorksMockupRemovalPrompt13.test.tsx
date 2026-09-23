import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import HowItWorks from '../../components/marketing/HowItWorks.js';

describe('PROMPT 13 — Remove the Mocked Browser Graphic from How It Works', () => {
  const headerHtml = renderToString(<HowItWorksHeader />);
  const pageHtml = renderToString(<HowItWorks />);

  describe('1. Complete Removal of Mocked Browser Graphic', () => {
    it('does not contain the mock browser URL bar or domain in either surface', () => {
      expect(headerHtml).not.toContain('paperworking.com/dashboard/portfolio');
      expect(pageHtml).not.toContain('paperworking.com/dashboard/portfolio');
    });

    it('does not contain the fake window chrome traffic-light dots in either surface', () => {
      expect(headerHtml).not.toContain('bg-red-500/80');
      expect(headerHtml).not.toContain('bg-yellow-500/80');
      expect(headerHtml).not.toContain('bg-green-500/80');

      expect(pageHtml).not.toContain('bg-red-500/80');
      expect(pageHtml).not.toContain('bg-yellow-500/80');
      expect(pageHtml).not.toContain('bg-green-500/80');
    });

    it('does not contain the mocked dashboard header or sync pill in either surface', () => {
      expect(headerHtml).not.toContain('Global Portfolio Dashboard');
      expect(headerHtml).not.toContain('Real-time consolidated asset metrics');
      expect(headerHtml).not.toContain('Live Sync Active');

      expect(pageHtml).not.toContain('Global Portfolio Dashboard');
      expect(pageHtml).not.toContain('Real-time consolidated asset metrics');
      expect(pageHtml).not.toContain('Live Sync Active');
    });

    it('does not contain the mocked metric cards in either surface', () => {
      expect(headerHtml).not.toContain('Total Equity');
      expect(headerHtml).not.toContain('$1.12M');
      expect(headerHtml).not.toContain('Portfolio DSCR');
      expect(headerHtml).not.toContain('$14,250');

      expect(pageHtml).not.toContain('Total Equity');
      expect(pageHtml).not.toContain('$1.12M');
      expect(pageHtml).not.toContain('Portfolio DSCR');
      expect(pageHtml).not.toContain('$14,250');
    });

    it('does not contain the mocked Kanban pipeline deals in either surface', () => {
      const mockDeals = [
        'Active Deal Pipeline',
        'Oakridge Duplex',
        'Alpine Apartments',
        '124 Pine St Fourplex',
        'Maple Street Triplex',
        'Summit Single Family',
      ];

      for (const deal of mockDeals) {
        expect(headerHtml).not.toContain(deal);
        expect(pageHtml).not.toContain(deal);
      }
    });
  });

  describe('2. Anchor Integrity', () => {
    it('preserves the #how-it-works section anchor ID in HowItWorksHeader', () => {
      expect(headerHtml).toContain('id="how-it-works"');
    });
  });

  describe('3. Clean Reflow & Content Presence', () => {
    it('does not render the removed section kicker, headline, or REIL narrative in either surface', () => {
      const removedBlocks = [
        'Project Management software made specifically for real estate investor.',
        'How the Real Estate Investment Lifecycle Works.',
        'The Real Estate Investment Lifecycle (REIL) is a system',
      ];

      for (const block of removedBlocks) {
        expect(headerHtml).not.toContain(block);
        expect(pageHtml).not.toContain(block);
      }
    });

    it('renders the REIL phase modules directly without orphaned containers in both surfaces', () => {
      expect(headerHtml).toContain('data-testid="reil-phase-modules"');
      expect(headerHtml).not.toContain('max-w-5xl rounded-xl border border-white/10 bg-[#0a0a0f]/90');

      expect(pageHtml).toContain('data-testid="reil-phase-modules"');
      expect(pageHtml).not.toContain('max-w-5xl rounded-xl border border-white/10 bg-[#0a0a0f]/90');
    });
  });
});
