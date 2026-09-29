import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import PropertyConditionValuationCard from '../../components/projects/fund/PropertyConditionValuationCard';
import type { ProjectFundingTerms } from '../../lib/projects/types';

const cleanHtml = (raw: string) => raw.replace(/<!-- -->/g, '');

const sampleClearedFunding: ProjectFundingTerms = {
  loanAmount: 294000,
  interestRatePct: 6.875,
  amortizationYears: 30,
  downPayment: 98000,
  closingCosts: 7840,
  actualCashToClose: 105840,
  fundingStatus: 'Term Sheet Received',
  lenderName: 'Apex Commercial Capital',
  loanType: 'Hard Money / Bridge',
  monthlyDebtService: 1931.33,
  valuationVerification: {
    appraisedValue: 510000,
    appraisalCompany: 'CBRE Valuation Services',
    appraisalDate: '2026-08-11',
    contractPurchasePrice: 392000,
    appraisalGapAmount: 0,
    gapResolutionStrategy: 'none',
    phase1EsaStatus: 'clean',
    surveyStatus: 'clean',
    physicalInspectionSignedOff: true,
    inspectionClearanceDate: '2026-08-10',
    notes: 'Commercial appraisal exceeds purchase price by $118,000. Phase I ESA clear with zero RECs.',
  },
};

const sampleShortfallFunding: ProjectFundingTerms = {
  loanAmount: 294000,
  interestRatePct: 6.875,
  amortizationYears: 30,
  downPayment: 98000,
  closingCosts: 7840,
  actualCashToClose: 105840,
  fundingStatus: 'Underwriting',
  lenderName: 'Apex Commercial Capital',
  loanType: 'Hard Money / Bridge',
  valuationVerification: {
    appraisedValue: 350000,
    appraisalCompany: 'Apex Appraisal Group',
    appraisalDate: '2026-08-12',
    contractPurchasePrice: 392000,
    appraisalGapAmount: 42000,
    gapResolutionStrategy: 'renegotiate_price',
    phase1EsaStatus: 'rec_identified',
    surveyStatus: 'encroachments_noted',
    physicalInspectionSignedOff: false,
    inspectionClearanceDate: '',
    notes: 'Shortfall of $42,000 identified. Historical dry cleaner REC noted on adjacent parcel.',
  },
};

describe('PropertyConditionValuationCard Component (Pillar 2: Valuation, Narrative Appraisal Gap & Environmental Clearance)', () => {
  describe('1. Commercial Narrative Appraisal & Cleared Appraisal State', () => {
    it('renders narrative appraisal fields and cleared state when appraisedValue >= purchasePrice', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Pillar 2: Valuation, Narrative Appraisal Gap &amp; Environmental Clearance');
      expect(html).toContain('Commercial Narrative Appraisal');
      expect(html).toContain('CBRE Valuation Services');
      expect(html).toContain('510000');
      expect(html).toContain('Appraisal Valuation Cleared');
      expect(html).toContain('Valuation Cleared');
      expect(html).toContain('+$118,000');
      expect(html).toContain('Property collateral fully supports senior debt basis with zero appraisal shortfall');
    });
  });

  describe('2. Appraisal Shortfall Detection & Institutional Gap Resolution Strategy', () => {
    it('displays shortfall banner, gap amount, and LTV compression warning when appraisedValue < purchasePrice', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleShortfallFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Appraisal Shortfall Detected');
      expect(html).toContain('Shortfall Detected');
      expect(html).toContain('Gap: -$42,000');
      expect(html).toContain('LTV Compression Warning');
      expect(html).toContain('Institutional Resolution Strategy');
      expect(html).toContain('Seller Price Reduction to Appraised Value');
      expect(html).toContain('Additional Cash Equity Injection to preserve loan terms');
      expect(html).toContain('Formal Appraisal Rebuttal / Reconsideration of Value (ROV)');
      expect(html).toContain('Seller Price Reduction: Issue contract amendment');
    });
  });

  describe('3. Environmental & Physical Diligence Clearance', () => {
    it('renders Phase I ESA options, ALTA survey options, and physical inspection toggle', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleShortfallFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      // Phase I ESA
      expect(html).toContain('Phase I Environmental Site Assessment (ESA)');
      expect(html).toContain('Phase I Clean (No RECs)');
      expect(html).toContain('Recognized Environmental Condition (REC) Identified');
      expect(html).toContain('Phase II Subsurface Testing Recommended');
      expect(html).toContain('Environmental Review Waived');

      // Survey
      expect(html).toContain('ALTA / Boundary Survey Review');
      expect(html).toContain('Survey Clean (No Boundary Encroachments)');
      expect(html).toContain('Easements or Encroachments Noted');
      expect(html).toContain('Survey In Progress');
      expect(html).toContain('Survey Waived by Title &amp; Lender');

      // Physical Inspection
      expect(html).toContain('Physical &amp; Structural Inspection Cleared by Due Diligence Lead');
      expect(html).toContain('Due Diligence Findings &amp; Engineering Notes');
    });
  });

  describe('3b. Licensed Property Inspection & Scheduling', () => {
    it('renders inspector firm, licensed inspector name, license number, and inspection status', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Licensed Property Inspection &amp; Physical Health');
      expect(html).toContain('data-testid="input-inspector-firm"');
      expect(html).toContain('data-testid="input-inspector-name"');
      expect(html).toContain('data-testid="input-license-number"');
      expect(html).toContain('data-testid="input-scheduled-inspection-date"');
      expect(html).toContain('data-testid="input-contingency-deadline"');
    });
  });

  describe('3c. Inspection Defect Discovery & Repair/Credit Negotiation Ledger', () => {
    it('renders repair negotiation ledger with defect categories, estimated costs, and total credit calculation', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Inspection Defect Discovery &amp; Repair/Credit Negotiation Ledger');
      expect(html).toContain('data-testid="repair-issues-ledger"');
      expect(html).toContain('data-testid="btn-toggle-add-issue"');
      expect(html).toContain('data-testid="checkbox-repair-amendment"');
      expect(html).toContain('data-testid="total-credits-negotiated-display"');
      expect(html).toContain('Repair Amendment / Closing Credit Addendum Fully Executed');
    });
  });

  describe('3d. Final Walk-Through Protocol (24 to 48 Hours Pre-Closing)', () => {
    it('renders 4-point condition checklist and pre-closing authorization sign-off', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Final Walk-Through Protocol (24 to 48 Hours Pre-Closing)');
      expect(html).toContain('data-testid="section-final-walkthrough"');
      expect(html).toContain('data-testid="check-repairs-verified"');
      expect(html).toContain('data-testid="check-broom-clean"');
      expect(html).toContain('data-testid="check-utilities-operational"');
      expect(html).toContain('data-testid="check-no-new-damage"');
      expect(html).toContain('data-testid="checkbox-walkthrough-signoff"');
      expect(html).toContain('Execute Final Walk-Through Sign-off &amp; Authorize Escrow Release');
    });
  });

  describe('4. Action Button & Touch Targets', () => {
    it('renders Save Valuation & Condition Records button with 44px min touch target', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('Save Valuation &amp; Condition Records');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('data-testid="btn-save-valuation-record"');
    });
  });

  describe('5. Responsive Gospel & Design System Compliance', () => {
    it('enforces rounded-none on card, badges, inputs, and buttons', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('rounded-none');
      // Verify no rounded-lg or rounded-xl or rounded-2xl in the component output
      expect(html).not.toContain('rounded-xl');
      expect(html).not.toContain('rounded-2xl');
      expect(html).not.toContain('rounded-lg');
    });

    it('enforces 16px text-base on mobile inputs for iOS Safari auto-zoom prevention', () => {
      const html = cleanHtml(
        renderToString(
          <PropertyConditionValuationCard
            funding={sampleClearedFunding}
            purchasePrice={392000}
            onUpdateFunding={() => {}}
          />,
        ),
      );

      expect(html).toContain('text-base');
      expect(html).toContain('sm:text-xs');
    });
  });

  describe('6. Anti-Slop Integrity Audit', () => {
    it('contains strictly zero occurrences of forbidden term and zero em-dashes in source file', () => {
      const baseDir = process.cwd().endsWith('apps/web') ? process.cwd() : path.join(process.cwd(), 'apps/web');
      const filePath = path.resolve(
        baseDir,
        'components/projects/fund/PropertyConditionValuationCard.tsx',
      );
      const source = fs.readFileSync(filePath, 'utf8');

      // Check forbidden term (case-insensitive)
      expect(source.toLowerCase()).not.toContain('s' + 'p' + 'o' + 'n' + 's' + 'o' + 'r');

      // Check em-dash
      expect(source).not.toContain('—');
      expect(source).not.toContain('&mdash;');
    });
  });
});
