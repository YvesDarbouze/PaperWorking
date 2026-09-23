import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorks from '../../components/marketing/HowItWorks.js';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import ReilPhaseModules from '../../components/marketing/ReilPhaseModules.js';
import { REIL_PHASE_MODULES } from '../../lib/marketing/reilModules.js';

function decodeHtml(html: string) {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const REMOVED_PROSE = [
  'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
];

describe('How It Works — REIL 4-Phase Modules Placement Above the Fold', () => {
  const howItWorksHtml = renderToString(<HowItWorks />);
  const decodedHowItWorks = decodeHtml(howItWorksHtml);

  const headerHtml = renderToString(<HowItWorksHeader />);
  const decodedHeader = decodeHtml(headerHtml);

  const modulesHtml = renderToString(<ReilPhaseModules />);
  const decodedModules = decodeHtml(modulesHtml);

  describe('1. Exactly One Modules Instance on Each Surface', () => {
    it('renders ReilPhaseModules exactly once in HowItWorks and HowItWorksHeader', () => {
      const headerCount = headerHtml.split('data-testid="reil-phase-modules"').length - 1;
      const pageCount = howItWorksHtml.split('data-testid="reil-phase-modules"').length - 1;

      expect(headerCount).toBe(1);
      expect(pageCount).toBe(1);
    });
  });

  describe('2. Four Modules in Fixed Order', () => {
    it('defines the modules in the fixed order Acquisition -> Fund -> Hold -> Exit', () => {
      expect(REIL_PHASE_MODULES).toHaveLength(4);
      expect(REIL_PHASE_MODULES.map((module) => module.title)).toEqual([
        'Acquisition',
        'Fund',
        'Hold',
        'Exit',
      ]);
    });

    it('renders the four module titles in order on both surfaces', () => {
      for (const decoded of [decodedHeader, decodedHowItWorks]) {
        const acqIndex = decoded.indexOf('>Acquisition</h3>');
        const fundIndex = decoded.indexOf('>Fund</h3>');
        const holdIndex = decoded.indexOf('>Hold</h3>');
        const exitIndex = decoded.indexOf('>Exit</h3>');

        expect(acqIndex).toBeGreaterThan(-1);
        expect(fundIndex).toBeGreaterThan(acqIndex);
        expect(holdIndex).toBeGreaterThan(fundIndex);
        expect(exitIndex).toBeGreaterThan(holdIndex);
      }
    });
  });

  describe('3. Verbatim 14 Bullets', () => {
    it('renders all 14 module bullets verbatim on both surfaces', () => {
      const bullets = REIL_PHASE_MODULES.flatMap((module) => module.bullets);
      expect(bullets).toHaveLength(14);

      for (const bullet of bullets) {
        expect(decodedModules).toContain(bullet);
        expect(decodedHeader).toContain(bullet);
        expect(decodedHowItWorks).toContain(bullet);
      }
    });
  });

  describe('4. Removed Blocks Are Gone From Both Surfaces', () => {
    it('does not render the removed ReilLifecycleCards wrapper in either surface', () => {
      expect(headerHtml).not.toContain('data-testid="reil-lifecycle-cards"');
      expect(howItWorksHtml).not.toContain('data-testid="reil-lifecycle-cards"');
    });

    it('does not render the removed eyebrow or subheadline in either surface', () => {
      const removedHeadings = [
        'BUILT ON THE REAL ESTATE INVESTMENT LIFE CYCLE',
        'Acquisition, Fund, Hold, Exit. Four phases. One system.',
      ];

      for (const heading of removedHeadings) {
        expect(decodedHeader).not.toContain(heading);
        expect(decodedHowItWorks).not.toContain(heading);
      }
    });

    it('does not render the removed ReilLifecycleCards prose copy in either surface', () => {
      for (const prose of REMOVED_PROSE) {
        expect(decodedHeader).not.toContain(prose);
        expect(decodedHowItWorks).not.toContain(prose);
      }
    });
  });

  describe('5. Responsive Styling Structure', () => {
    it('uses responsive 1-column mobile, 2-column tablet, and 4-column desktop grid', () => {
      expect(modulesHtml).toContain('grid-cols-1');
      expect(modulesHtml).toContain('md:grid-cols-2');
      expect(modulesHtml).toContain('lg:grid-cols-4');
    });

    it('applies design system typography and emerald accent colors', () => {
      expect(modulesHtml).toContain('text-[#00DD94]');
      expect(modulesHtml).toContain('font-[family-name:var(--font-jetbrains-mono)]');
    });
  });
});
