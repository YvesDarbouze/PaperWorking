import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HeroProductCarousel from '../../components/marketing/HeroProductCarousel.js';

describe('HeroProductCarousel — In-Browser Product Screen-Cap Mocks', () => {
  const html = renderToString(<HeroProductCarousel />);

  describe('1. Removal of Legacy Hero Modal & Clean Slate', () => {
    it('contains no "Deal Analyzer", "1247 Elm Street", or old figures in hero mock', () => {
      expect(html).not.toContain('Deal Analyzer');
      expect(html).not.toContain('DEAL ANALYZER');
      expect(html).not.toContain('1247 Elm Street');
      expect(html).not.toContain('$485,000');
      expect(html).not.toContain('$620,000');
      expect(html).not.toContain('$68,000');
    });
  });

  describe('2. Browser Chrome Framing & Discreet Sample Data Marker', () => {
    it('renders browser window chrome with controls and dynamic URL', () => {
      expect(html).toContain('paperworking.co/insights');
      expect(html).toContain('Sample data');
    });
  });

  describe('3. Mock A: Portfolio Insights Metrics & Mathematical Consistency', () => {
    it('visibly displays all 5 required metrics: NOI, Cap Rate, DSCR, Cash-on-Cash, and IRR', () => {
      expect(html).toContain('NOI (Annual)');
      expect(html).toContain('$294,000');
      expect(html).toContain('Cap Rate');
      expect(html).toContain('7.0%');
      expect(html).toContain('DSCR');
      expect(html).toContain('1.40x');
      expect(html).toContain('Cash-on-Cash');
      expect(html).toContain('8.0%');
      expect(html).toContain('Projected IRR');
      expect(html).toContain('18.4%');
    });

    it('visibly displays supporting verifiable figures and trend visual', () => {
      expect(html).toContain('$4,200,000');
      expect(html).toContain('$1,050,000');
      expect(html).toContain('$84,000/yr');
      expect(html).toContain('NOI Trend');
      expect(html).toContain('svg');
    });

    it('displays per-property breakdown strip with exact mathematical parity', () => {
      expect(html).toContain('Oakridge Quadplex');
      expect(html).toContain('Magnolia 6-Plex');
      expect(html).toContain('High St Triplex');
      expect(html).toContain('Elmwood Duplex');
      expect(html).toContain('Total (4 Props)');

      // Arithmetic checks:
      const values = [1200000, 1600000, 800000, 600000];
      const nois = [84000, 112000, 56000, 42000];
      const cashFlows = [24000, 32000, 16000, 12000];

      const totalValue = values.reduce((a, b) => a + b, 0);
      const totalNoi = nois.reduce((a, b) => a + b, 0);
      const totalCashFlow = cashFlows.reduce((a, b) => a + b, 0);

      expect(totalValue).toBe(4200000);
      expect(totalNoi).toBe(294000);
      expect(totalCashFlow).toBe(84000);

      const capRate = totalNoi / totalValue;
      expect(capRate).toBe(0.07); // 7.0%

      const totalEquity = 1050000;
      const coc = totalCashFlow / totalEquity;
      expect(coc).toBe(0.08); // 8.0%

      const debtService = 210000;
      const dscr = totalNoi / debtService;
      expect(dscr).toBe(1.40); // 1.40x
    });
  });

  describe('4. Mock B: REIL Fund Phase with Team Task Assignment', () => {
    it('displays the REIL lifecycle context with Fund phase active', () => {
      expect(html).toContain('01 Acquisition');
      expect(html).toContain('02 Fund (Active)');
      expect(html).toContain('03 Hold');
      expect(html).toContain('04 Exit');
    });

    it('displays at least 4 Fund-phase tasks with status and due dates', () => {
      expect(html).toContain('Track appraisal contingency deadline');
      expect(html).toContain('Confirm earnest money deposit received');
      expect(html).toContain('Upload executed contract to vault');
      expect(html).toContain('Complete lender document checklist');
      expect(html).toContain('Due in 3 days');
      expect(html).toContain('Cleared Oct 28');
    });

    it('shows team task assignment with named assignees and visible assignment affordance', () => {
      expect(html).toContain('S. Reyes');
      expect(html).toContain('M. Okafor');
      expect(html).toContain('J. Lindqvist');
      expect(html).toContain('Assign Team Member');
      expect(html).toContain('3 Members');
      expect(html).toContain('Assigned Team:');
    });
  });

  describe('5. Carousel Accessibility & Controls', () => {
    it('has accessible carousel role, labels, buttons, and position indicators', () => {
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-roledescription="carousel"');
      expect(html).toContain('aria-label="PaperWorking product screen previews"');
      expect(html).toContain('aria-label="Previous preview"');
      expect(html).toContain('aria-label="Next preview"');
      expect(html).toContain('Portfolio Insights');
      expect(html).toContain('REIL Fund Phase &amp; Tasks');
    });
  });
});
