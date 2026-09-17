import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import HowItWorks from '../../components/marketing/HowItWorks.js';
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

describe('PROMPT 11 — Four REIL Phase Modules with Bulleted Activities', () => {
  const headerHtml = renderToString(<HowItWorksHeader />);
  const howItWorksHtml = renderToString(<HowItWorks />);
  const standaloneModulesHtml = renderToString(<ReilPhaseModules />);

  const decodedHeader = decodeHtml(headerHtml);
  const decodedHowItWorks = decodeHtml(howItWorksHtml);
  const decodedStandalone = decodeHtml(standaloneModulesHtml);

  describe('1. Four Modules Presence, Order & Titles', () => {
    it('defines exactly four modules in the fixed order: Acquisition -> Fund -> Hold -> Exit', () => {
      expect(REIL_PHASE_MODULES).toHaveLength(4);
      expect(REIL_PHASE_MODULES.map((m) => m.title)).toEqual([
        'Acquisition',
        'Fund',
        'Hold',
        'Exit',
      ]);
    });

    it('renders the modules in correct reading order in HowItWorksHeader', () => {
      const narrativeIndex = decodedHeader.indexOf(
        'how the investor exited: a complete sale'
      );
      const acqIndex = decodedHeader.indexOf('Acquisition</h3>');
      const fundIndex = decodedHeader.indexOf('Fund</h3>');
      const holdIndex = decodedHeader.indexOf('Hold</h3>');
      const exitIndex = decodedHeader.indexOf('Exit</h3>');

      expect(narrativeIndex).toBeGreaterThan(-1);
      expect(acqIndex).toBeGreaterThan(narrativeIndex);
      expect(fundIndex).toBeGreaterThan(acqIndex);
      expect(holdIndex).toBeGreaterThan(fundIndex);
      expect(exitIndex).toBeGreaterThan(holdIndex);
    });

    it('renders the modules in correct reading order in HowItWorks page component', () => {
      const narrativeIndex = decodedHowItWorks.indexOf(
        'how the investor exited: a complete sale'
      );
      const acqIndex = decodedHowItWorks.indexOf('Acquisition</h3>');
      const fundIndex = decodedHowItWorks.indexOf('Fund</h3>');
      const holdIndex = decodedHowItWorks.indexOf('Hold</h3>');
      const exitIndex = decodedHowItWorks.indexOf('Exit</h3>');

      expect(narrativeIndex).toBeGreaterThan(-1);
      expect(acqIndex).toBeGreaterThan(narrativeIndex);
      expect(fundIndex).toBeGreaterThan(acqIndex);
      expect(holdIndex).toBeGreaterThan(fundIndex);
      expect(exitIndex).toBeGreaterThan(holdIndex);
    });
  });

  describe('2. Exact Verbatim Bullets per Module', () => {
    it('renders exactly the 5 specified bullets for Acquisition', () => {
      const acq = REIL_PHASE_MODULES[0];
      expect(acq?.bullets).toHaveLength(5);
      expect(acq?.bullets).toEqual([
        'Source and track deal leads',
        'Pull live property data and an automated valuation',
        'Underwrite with the Deal Calculator (cap rate, IRR, cash-on-cash)',
        'Make offers and track negotiations',
        'Optionally crowdfund a deal with serious investors',
      ]);

      for (const bullet of acq!.bullets) {
        expect(decodedHeader).toContain(bullet);
        expect(decodedHowItWorks).toContain(bullet);
      }
    });

    it('renders exactly the 4 specified bullets for Fund', () => {
      const fund = REIL_PHASE_MODULES[1];
      expect(fund?.bullets).toHaveLength(4);
      expect(fund?.bullets).toEqual([
        'Line up the money and the paperwork',
        'Track contingency deadlines and earnest money',
        'Keep contracts in one vault',
        'Get alerted before dates go hard',
      ]);

      for (const bullet of fund!.bullets) {
        expect(decodedHeader).toContain(bullet);
        expect(decodedHowItWorks).toContain(bullet);
      }
    });

    it('renders exactly the 3 specified bullets for Hold', () => {
      const hold = REIL_PHASE_MODULES[2];
      expect(hold?.bullets).toHaveLength(3);
      expect(hold?.bullets).toEqual([
        'Link milestones to your budget',
        'Log expenses as they happen',
        'Watch holding costs and budget-vs-actual in real time',
      ]);

      for (const bullet of hold!.bullets) {
        expect(decodedHeader).toContain(bullet);
        expect(decodedHowItWorks).toContain(bullet);
      }
    });

    it('renders exactly the 2 specified bullets for Exit', () => {
      const exit = REIL_PHASE_MODULES[3];
      expect(exit?.bullets).toHaveLength(2);
      expect(exit?.bullets).toEqual([
        'Sell outright or keep as rental / lease / Airbnb / pop-up / commercial',
        'Generate the performance record your buyer, lender, or appraiser expects',
      ]);

      for (const bullet of exit!.bullets) {
        expect(decodedHeader).toContain(bullet);
        expect(decodedHowItWorks).toContain(bullet);
      }
    });
  });

  describe('3. Specific Terminology & Substance', () => {
    it('preserves key terminology in phase module bullets', () => {
      expect(decodedStandalone).toContain('Deal Calculator (cap rate, IRR, cash-on-cash)');
      expect(decodedStandalone).toContain('crowdfund a deal with serious investors');
      expect(decodedStandalone).toContain('dates go hard');
      expect(decodedStandalone).toContain('budget-vs-actual in real time');
      expect(decodedStandalone).toContain('buyer, lender, or appraiser expects');
    });

    it('contains zero unapproved or invented marketing phrasing', () => {
      expect(decodedStandalone).not.toContain('sourced to your buy box');
      expect(decodedStandalone).not.toContain('roll realized outcomes back');
      expect(decodedStandalone).not.toContain('syndicate with institutional ease');
    });
  });

  describe('4. Accessibility & Responsive Structure', () => {
    it('uses proper list semantics (<ul> and <li>) for all module bullets', () => {
      // 4 UL elements for the 4 phase modules in the component
      const ulMatches = standaloneModulesHtml.match(/<ul /g);
      expect(ulMatches).toHaveLength(4);

      // Total 14 bullets (5 + 4 + 3 + 2)
      const liMatches = standaloneModulesHtml.match(/<li /g);
      expect(liMatches).toHaveLength(14);
    });

    it('contains no interactive elements (no buttons, no links) inside modules', () => {
      expect(standaloneModulesHtml).not.toContain('<a');
      expect(standaloneModulesHtml).not.toContain('<button');
      expect(standaloneModulesHtml).not.toContain('<input');
    });

    it('renders with responsive grid layout (1 col mobile, 2 col tablet, 4 col desktop)', () => {
      expect(standaloneModulesHtml).toContain('grid-cols-1');
      expect(standaloneModulesHtml).toContain('md:grid-cols-2');
      expect(standaloneModulesHtml).toContain('lg:grid-cols-4');
    });
  });
});
