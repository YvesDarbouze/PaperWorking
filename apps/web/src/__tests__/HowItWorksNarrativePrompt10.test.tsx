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
  const rawHeaderHtml = renderToString(<HowItWorksHeader />);
  const rawHowItWorksHtml = renderToString(<HowItWorks />);
  const headerText = decodeHtml(rawHeaderHtml);
  const howItWorksText = decodeHtml(rawHowItWorksHtml);

  describe('1. Verbatim Copy & Acceptance Phrases', () => {
    it('renders the lead-in sentence with exact punctuation and clean acronym', () => {
      const expectedLead =
        'The Real Estate Investment Lifecycle (REIL) is a system created to properly manage your real estate investments in 4 compartmentalized steps.';
      expect(reilNarrativeLead).toBe(expectedLead);
      expect(headerText).toContain(expectedLead);
      expect(howItWorksText).toContain(expectedLead);

      // Verify specific required phrases
      expect(headerText).toContain('The Real Estate Investment Lifecycle (REIL)');
      expect(headerText).toContain('4 compartmentalized steps');
    });

    it('renders Phase 1 (Acquisition) with exact phrasing and capitalized Deals', () => {
      expect(headerText).toContain(
        'hunting for investment opportunities, the option to crowdfund a deal working with serious investors, and tracking outcomes of individual Deals when you exit.'
      );
      expect(headerText).toContain('individual Deals when you exit');
      expect(reilNarrativeAcquisitionFull).toBe(
        'PHASE 01 · ACQUISITION — hunting for investment opportunities, the option to crowdfund a deal working with serious investors, and tracking outcomes of individual Deals when you exit.'
      );
    });

    it('renders Phase 2 (Fund) with exact phrasing and documentation and paperwork', () => {
      expect(headerText).toContain(
        'where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.'
      );
      expect(reilNarrativeFundFull).toBe(
        'PHASE 02 · FUND — where you fund the project and compile the necessary documentation and paperwork to make a real-estate transaction.'
      );
    });

    it('renders Phase 3 (Hold) with exact phrasing, capitalized Projects, and costs? question mark', () => {
      expect(headerText).toContain(
        'before you start collecting a return on your Projects: what are your costs?'
      );
      expect(headerText).toContain('return on your Projects: what are your costs?');
      expect(reilNarrativeHoldFull).toBe(
        'PHASE 03 · HOLD — before you start collecting a return on your Projects: what are your costs?'
      );
    });

    it('renders Phase 4 (Exit) with exact phrasing, Airbnb, pop-ups, commercial, etc.', () => {
      expect(headerText).toContain(
        'how the investor exited: a complete sale, or renting, leasing, Airbnb, pop-ups, commercial, etc.'
      );
      expect(headerText).toContain('Airbnb, pop-ups, commercial, etc.');
      expect(reilNarrativeExitFull).toBe(
        'PHASE 04 · EXIT — how the investor exited: a complete sale, or renting, leasing, Airbnb, pop-ups, commercial, etc.'
      );
    });
  });

  describe('2. Structural Sequence & Reading Order', () => {
    it('orders the narrative sequence correctly in HowItWorksHeader: lead-in -> Acquisition -> Fund -> Hold -> Exit', () => {
      const kickerIndex = headerText.indexOf(
        'Project Management software made specifically for real estate investor.'
      );
      const headlineIndex = headerText.indexOf(
        'How the Real Estate Investment Lifecycle Works.'
      );
      const leadIndex = headerText.indexOf(
        'The Real Estate Investment Lifecycle (REIL)'
      );
      const acqIndex = headerText.indexOf('hunting for investment opportunities');
      const fundIndex = headerText.indexOf('where you fund the project');
      const holdIndex = headerText.indexOf('before you start collecting a return');
      const exitIndex = headerText.indexOf('how the investor exited');

      expect(kickerIndex).toBeGreaterThan(-1);
      expect(headlineIndex).toBeGreaterThan(kickerIndex);
      expect(leadIndex).toBeGreaterThan(headlineIndex);
      expect(acqIndex).toBeGreaterThan(leadIndex);
      expect(fundIndex).toBeGreaterThan(acqIndex);
      expect(holdIndex).toBeGreaterThan(fundIndex);
      expect(exitIndex).toBeGreaterThan(holdIndex);
    });

    it('orders the narrative sequence correctly in HowItWorks component', () => {
      const headlineIndex = howItWorksText.indexOf(
        'How the Real Estate Investment Lifecycle Works.'
      );
      const leadIndex = howItWorksText.indexOf(
        'The Real Estate Investment Lifecycle (REIL)'
      );
      const acqIndex = howItWorksText.indexOf('hunting for investment opportunities');
      const fundIndex = howItWorksText.indexOf('where you fund the project');
      const holdIndex = howItWorksText.indexOf('before you start collecting a return');
      const exitIndex = howItWorksText.indexOf('how the investor exited');

      expect(headlineIndex).toBeGreaterThan(-1);
      expect(leadIndex).toBeGreaterThan(headlineIndex);
      expect(acqIndex).toBeGreaterThan(leadIndex);
      expect(fundIndex).toBeGreaterThan(acqIndex);
      expect(holdIndex).toBeGreaterThan(fundIndex);
      expect(exitIndex).toBeGreaterThan(holdIndex);
    });
  });

  describe('3. Emphasis & Typography', () => {
    it('applies semantic <strong> tags and emerald accent to consistent phase labels (phase number + name + description)', () => {
      expect(rawHeaderHtml).toContain(
        '<strong class="font-semibold text-[#00DD94]">PHASE 01 · ACQUISITION —</strong>'
      );
      expect(rawHeaderHtml).toContain(
        '<strong class="font-semibold text-[#00DD94]">PHASE 02 · FUND —</strong>'
      );
      expect(rawHeaderHtml).toContain(
        '<strong class="font-semibold text-[#00DD94]">PHASE 03 · HOLD —</strong>'
      );
      expect(rawHeaderHtml).toContain(
        '<strong class="font-semibold text-[#00DD94]">PHASE 04 · EXIT —</strong>'
      );
    });

    it('is static text with no interactive buttons or links in the narrative list', () => {
      // Find the UL containing the phases
      const ulStart = rawHeaderHtml.indexOf('<ul class="space-y-3.5 list-none pl-0">');
      const ulEnd = rawHeaderHtml.indexOf('</ul>', ulStart);
      const listSubstr = rawHeaderHtml.substring(ulStart, ulEnd);

      expect(listSubstr).not.toContain('<a');
      expect(listSubstr).not.toContain('<button');
      expect(listSubstr).not.toContain('<input');
    });
  });
});
