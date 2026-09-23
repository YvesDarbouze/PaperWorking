import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HowItWorksHeader from '../../sections/HowItWorksHeader.js';
import HowItWorks from '../../components/marketing/HowItWorks.js';
import {
  reilNarrativeLead,
  reilNarrativeAcquisitionFull,
  reilNarrativeFundFull,
  reilNarrativeHoldFull,
  reilNarrativeExitFull,
} from '../../lib/marketing/copy.js';

function decodeHtml(html: string) {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

describe('Real Estate Investment Lifecycle (REIL) Core Concept Narrative', () => {
  const headerText = decodeHtml(renderToString(<HowItWorksHeader />));
  const howItWorksText = decodeHtml(renderToString(<HowItWorks />));

  const narrativeStrings = [
    reilNarrativeLead,
    reilNarrativeAcquisitionFull,
    reilNarrativeFundFull,
    reilNarrativeHoldFull,
    reilNarrativeExitFull,
  ];

  describe('1. Verbatim Copy Locked in the Copy Module', () => {
    it('locks the lead-in sentence with exact punctuation and clean acronym', () => {
      const expectedLead =
        'The Real Estate Investment Lifecycle (REIL) is a system created to properly manage your real estate investments in 4 compartmentalized steps.';
      expect(reilNarrativeLead).toBe(expectedLead);
    });

    it('locks Phase 1 (Acquisition) with exact phrasing and capitalized Deals', () => {
      expect(reilNarrativeAcquisitionFull).toBe(
        'PHASE 01 · ACQUISITION — hunting for investment opportunities, the option to crowdfund a deal working with serious investors, and tracking outcomes of individual Deals when you exit.'
      );
    });

    it('locks Phase 2 (Fund) with exact phrasing and documentation and paperwork', () => {
      expect(reilNarrativeFundFull).toBe(
        'PHASE 02 · FUND — where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.'
      );
    });

    it('locks Phase 3 (Hold) with exact phrasing, capitalized Projects, and costs? question mark', () => {
      expect(reilNarrativeHoldFull).toBe(
        'PHASE 03 · HOLD — before you start collecting a return on your Projects: what are your costs?'
      );
    });

    it('locks Phase 4 (Exit) with exact phrasing, Airbnb, pop-ups, commercial, etc.', () => {
      expect(reilNarrativeExitFull).toBe(
        'PHASE 04 · EXIT — how the investor exited: a complete sale, or renting, leasing, Airbnb, pop-ups, commercial, etc.'
      );
    });
  });

  describe('2. Narrative Not Rendered on Either How-It-Works Surface', () => {
    it('does not render the REIL narrative lead on either surface', () => {
      expect(headerText).not.toContain(reilNarrativeLead);
      expect(howItWorksText).not.toContain(reilNarrativeLead);
    });

    it('does not render any REIL phase narrative block on either surface', () => {
      for (const narrative of narrativeStrings) {
        expect(headerText).not.toContain(narrative);
        expect(howItWorksText).not.toContain(narrative);
      }
    });

    it('does not render narrative prose fragments on either surface', () => {
      const removedFragments = [
        '4 compartmentalized steps',
        'hunting for investment opportunities',
        'where you fund the project',
        'before you start collecting a return',
        'how the investor exited',
      ];

      for (const fragment of removedFragments) {
        expect(headerText).not.toContain(fragment);
        expect(howItWorksText).not.toContain(fragment);
      }
    });
  });
});
