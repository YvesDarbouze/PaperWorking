import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import CapitalStackCard from '../../components/projects/fund/CapitalStackCard';
import type { ProjectFundingTerms } from '../../lib/projects/types';

const baseFundingTerms: ProjectFundingTerms = {
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
  capitalStack: {
    seniorDebt: 294000,
    mezzanineDebt: 25000,
    preferredEquity: 20000,
    investorEquity: 80000,
    leadEquity: 28840,
    totalCostBasis: 447840,
    ltvPct: 75.0,
    ltcPct: 65.6,
  },
  lenderConditions: [
    {
      id: 'cond-1',
      category: 'PTD',
      title: 'Phase I Environmental Site Assessment (ESA)',
      description: 'Clean environmental assessment',
      status: 'approved',
      clearedAt: '2026-08-12T10:00:00.000Z',
    },
    {
      id: 'cond-2',
      category: 'PTD',
      title: 'Appraisal Report Sign-Off',
      description: 'Appraisal meets purchase price',
      status: 'approved',
      clearedAt: '2026-08-14T15:30:00.000Z',
    },
    {
      id: 'cond-3',
      category: 'PTF',
      title: 'Borrower Equity Verification',
      description: 'Proof of wired funds to escrow',
      status: 'submitted',
    },
    {
      id: 'cond-4',
      category: 'CLOSING',
      title: 'ALTA Settlement Statement Countersignature',
      description: 'Signed settlement statement',
      status: 'pending',
    },
  ],
};

const cleanHtml = (raw: string) => raw.replace(/<!-- -->/g, '');

describe('CapitalStackCard Component', () => {
  it('renders header, key ratios, and metrics accurately', () => {
    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={baseFundingTerms}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Capital Stack &amp; Lender Conditions');
    expect(html).toContain('Senior LTV');
    expect(html).toContain('Senior LTC');
    expect(html).toContain('Total Capital Stack');
    expect(html).toContain('Cost Basis Match');
    expect(html).toContain('Balanced');
  });

  it('renders all capital stack layers with Lead Equity and strictly zero instances of forbidden term', () => {
    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={baseFundingTerms}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    // Verify all 5 layers appear
    expect(html).toContain('Senior Debt');
    expect(html).toContain('Mezzanine Debt');
    expect(html).toContain('Preferred Equity');
    expect(html).toContain('Investor / LP Equity');
    expect(html).toContain('Lead Equity');

    // Strict Anti-Slop verification: forbidden term must NOT exist anywhere in rendered HTML
    const forbiddenTermRegex = new RegExp('sponsor', 'i');
    expect(forbiddenTermRegex.test(html)).toBe(false);

    // Strict Anti-Slop verification: no em-dash
    expect(html.includes('—')).toBe(false);
  });

  it('renders multi-segmented proportional visual bar with correct accessibility and proportions', () => {
    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={baseFundingTerms}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Capital Stack Proportions"');
    expect(html).toContain('Senior');
    expect(html).toContain('Mezz');
    expect(html).toContain('Pref');
    expect(html).toContain('LP');
    expect(html).toContain('Lead');
  });

  it('renders Lender Underwriting Conditions Tracker with accurate clearance count and categories', () => {
    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={baseFundingTerms}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Lender Underwriting Conditions Tracker');
    // 2 of 4 conditions cleared (cond-1 and cond-2 are approved)
    expect(html).toContain('2 of 4 Conditions Cleared (50%)');
    expect(html).toContain('PTD (Prior to Document)');
    expect(html).toContain('PTF (Prior to Funding)');
    expect(html).toContain('CLOSING (Escrow Release)');
    expect(html).toContain('Phase I Environmental Site Assessment (ESA)');
    expect(html).toContain('Appraisal Report Sign-Off');
    expect(html).toContain('Borrower Equity Verification');
    expect(html).toContain('ALTA Settlement Statement Countersignature');
  });

  it('renders default conditions if funding.lenderConditions is undefined', () => {
    const fundingWithoutConditions: ProjectFundingTerms = {
      ...baseFundingTerms,
      lenderConditions: undefined,
    };

    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={fundingWithoutConditions}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Lender Underwriting Conditions Tracker');
    expect(html).toContain('Phase I Environmental Site Assessment (ESA)');
    expect(html).toContain('Certified Commercial Appraisal');
    expect(html).toContain('Borrowing Entity Certificate of Good Standing');
  });

  it('computes realistic default capital stack if funding.capitalStack is undefined', () => {
    const fundingWithoutStack: ProjectFundingTerms = {
      ...baseFundingTerms,
      capitalStack: undefined,
    };

    const html = cleanHtml(
      renderToString(
        <CapitalStackCard
          funding={fundingWithoutStack}
          purchasePrice={392000}
          totalCostBasis={447840}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Senior Debt');
    expect(html).toContain('Investor / LP Equity');
    expect(html).toContain('Lead Equity');
  });
});
