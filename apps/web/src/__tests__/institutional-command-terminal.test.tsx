import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import InstitutionalCommandTerminal from '../../components/dashboard/InstitutionalCommandTerminal.js';

describe('InstitutionalCommandTerminal Specification Suite', () => {
  const html = renderToString(<InstitutionalCommandTerminal />);

  describe('Module 1: Institutional Header & Ticker', () => {
    it('renders the PaperWorking // Command Terminal header', () => {
      expect(html).toContain('PaperWorking');
      expect(html).toContain('Command Terminal');
    });

    it('renders the multi-asset portfolio dropdown selector default', () => {
      expect(html).toContain('Multi-Asset Fund I (12 Assets)');
      expect(html).toContain('data-testid="portfolio-selector-dropdown"');
    });

    it('renders the 4 key horizontal ticker metrics', () => {
      expect(html).toContain('$42.8M'); // Total AUM
      expect(html).toContain('Total AUM');
      expect(html).toContain('Active Projects');
      expect(html).toContain('18.4%'); // Blended IRR
      expect(html).toContain('Blended IRR');
      expect(html).toContain('6.8%'); // Avg. Cap Rate
      expect(html).toContain('Avg. Cap Rate');
    });
  });

  describe('Module 2: 4-Phase Lifecycle Status Bar', () => {
    it('renders all four REIL phases', () => {
      expect(html).toContain('Phase 1: Acquisition');
      expect(html).toContain('Phase 2: Fund');
      expect(html).toContain('Phase 3: Hold');
      expect(html).toContain('Phase 4: Exit');
    });

    it('highlights Phase 3: Hold as the active state with cyan glow/badge', () => {
      expect(html).toContain('ACTIVE');
      expect(html).toContain('Renovation &amp; Asset Management');
    });
  });

  describe('Module 3: Central Intelligence Grid (KPI Visualization Cards)', () => {
    it('renders Card 1: Deal Calculator Card with pro-forma metrics and valuation gauge', () => {
      expect(html).toContain('data-testid="card-deal-calculator"');
      expect(html).toContain('742 Evergreen Terrace');
      expect(html).toContain('24 Units');
      expect(html).toContain('7.1%'); // Cap rate
      expect(html).toContain('8.2%'); // Cash-on-cash
      expect(html).toContain('1.35x'); // DSCR
      expect(html).toContain('Valuation Gauge');
      expect(html).toContain('$6,450,000 ARV');
    });

    it('renders Card 2: Budget vs. Actual Card with dual-bar visualization and holding costs', () => {
      expect(html).toContain('data-testid="card-budget-vs-actual"');
      expect(html).toContain('$12,400');
      expect(html).toContain('/mo carrying cost');
      expect(html).toContain('$380,000'); // Budgeted
      expect(html).toContain('$242,500'); // Actual
    });

    it('renders Card 3: Risk & Contingency Alert Card with amber alert and checklist', () => {
      expect(html).toContain('data-testid="card-risk-contingency-alert"');
      expect(html).toContain('⚠️ Earnest Date: 4 Days Remaining');
      expect(html).toContain('Title Search');
      expect(html).toContain('Property Inspection');
      expect(html).toContain('Financing Commitment');
    });
  });

  describe('Module 4: Project Timeline & Vault (Bottom Grid)', () => {
    it('renders Module 4A: Gantt / Contractor Milestone Timeline', () => {
      expect(html).toContain('data-testid="gantt-timeline-module"');
      expect(html).toContain('Gantt / Contractor Milestone Timeline — Hold Phase');
      expect(html).toContain('MEP Rough-In');
    });

    it('renders Module 4B: Document Vault Preview with status indicators', () => {
      expect(html).toContain('data-testid="document-vault-module"');
      expect(html).toContain('Purchase_Agreement_v3.pdf');
      expect(html).toContain('Verified');
      expect(html).toContain('Pending E-Sign');
    });
  });
});
