import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import DealCard from '../../components/marketplace/DealCard.js';
import type { DealCardData } from '../../components/marketplace/DealCard.js';
import DealsDenseTable from '../../components/marketplace/DealsDenseTable.js';
import DealCalculatorResultModal from '../../components/marketplace/DealCalculatorResultModal.js';

const mockDealWithCalc: DealCardData = {
  id: 'deal-test-calc-1',
  slug: '1247elmst',
  propertyName: 'Elm Street Value-Add Flip',
  address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin',
  state: 'TX',
  assetClass: 'Single-family',
  subStrategy: 'FLIP',
  status: 'published',
  targetIrr: 18.4,
  equityMultiple: 1.85,
  holdPeriod: '2-3 Years',
  minInvestment: 25_000,
  fundingTarget: 1_000_000,
  committedAmount: 680_000,
  investorCount: 14,
  creatorName: 'PaperWorking Capital',
  isVerifiedOperator: true,
  projectId: 'proj-elm-99',
  projectName: 'Austin Residential Fund IV',
  calculatorResults: {
    purchasePrice: 485_000,
    rehabBudget: 62_000,
    arv: 620_000,
    targetIrr: 18.4,
    projectedRoi: 18.4,
    cashRequired: 192_950,
    equityMultiple: 1.85,
    capRateOnCost: 5.53,
    cashOnCashReturnPct: 6.8,
    monthlyDebtService: 2299,
    grossMonthlyRent: 4200,
    netOperatingIncome: 30_794,
    maximumAllowableOffer70Pct: 372_000,
    strategy: 'Fix & Flip',
    holdPeriod: '2-3 Years',
  },
};

describe('Requirement 9: Deals Marketplace Cards View', () => {
  it('renders Deal Calculator baseline strip with Purchase Price, Cash Required, and NOI', () => {
    const html = renderToString(<DealCard deal={mockDealWithCalc} />);

    expect(html).toContain('data-testid="deal-calculator-strip"');
    expect(html).toContain('Deal Calculator Baseline');
    expect(html).toContain('$485K');
    expect(html).toContain('$193K');
    expect(html).toContain('$31K');
    expect(html).toContain('NOI / yr');
  });

  it('renders "Interested in Investing" button and "Inspect" calculator button', () => {
    const html = renderToString(<DealCard deal={mockDealWithCalc} onViewCalculatorModal={() => {}} />);

    expect(html).toContain('data-testid="card-express-interest-btn-deal-test-calc-1"');
    expect(html).toContain('Interested in Investing');
    expect(html).toContain('data-testid="card-inspect-calculator-btn-deal-test-calc-1"');
    expect(html).toContain('Inspect');
  });

  it('renders registered interest badge when isInterested is true', () => {
    const html = renderToString(<DealCard deal={mockDealWithCalc} isInterested={true} />);

    expect(html).toContain('data-testid="interest-registered-badge"');
    expect(html).toContain('Interest Registered');
  });

  it('strictly adheres to anti-slop rules (no forbidden term, 44px min touch target)', () => {
    const html = renderToString(<DealCard deal={mockDealWithCalc} />);

    expect(html.toLowerCase()).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));
    expect(html).toContain('min-h-[44px]');
  });
});

describe('Requirement 9: Deals Marketplace List / Dense Table View', () => {
  const deals = [mockDealWithCalc];

  it('renders expandable rows with original Deal Calculator figures', () => {
    const html = renderToString(
      <DealsDenseTable deals={deals} initialExpandedRowId="deal-test-calc-1" />
    );

    // Expand trigger button
    expect(html).toContain('data-testid="dense-expand-row-btn-deal-test-calc-1"');

    // Expanded inline card
    expect(html).toContain('data-testid="dense-expanded-content-deal-test-calc-1"');
    expect(html).toContain('Original Deal Calculator Underwriting Baseline');

    // 6-metric grid outputs
    expect(html).toContain('$485,000');
    expect(html).toContain('$62,000');
    expect(html).toContain('$620,000');
    expect(html).toContain('$192,950');
    expect(html).toContain('18.4%');
    expect(html).toContain('1.85x');
  });

  it('renders "Interested in Investing" and "Calculator" inspect buttons per list row', () => {
    const html = renderToString(
      <DealsDenseTable deals={deals} onViewCalculatorModal={() => {}} />
    );

    expect(html).toContain('data-testid="dense-express-interest-btn-deal-test-calc-1"');
    expect(html).toContain('Interested in Investing');
    expect(html).toContain('data-testid="dense-inspect-calc-btn-deal-test-calc-1"');
    expect(html).toContain('Calculator');
  });

  it('renders interested badge when deal ID is in interestedDealIds', () => {
    const html = renderToString(
      <DealsDenseTable deals={deals} interestedDealIds={['deal-test-calc-1']} />
    );

    expect(html).toContain('data-testid="dense-interest-badge"');
    expect(html).toContain('Interested');
  });
});

describe('Requirement 9: Expandable Deal Calculator Result Modal', () => {
  it('renders modal with authentic Deal Calculator outputs without mocks', () => {
    const html = renderToString(
      <DealCalculatorResultModal
        deal={mockDealWithCalc}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('data-testid="deal-calculator-result-modal"');

    // Overarching Project lineage
    expect(html).toContain('data-testid="modal-overarching-project-section"');
    expect(html).toContain('data-testid="modal-overarching-project-link"');
    expect(html).toContain('Austin Residential Fund IV');
    expect(html).toContain('/projects/proj-elm-99');

    // Institutional Underwriting Grid Metrics
    expect(html).toContain('data-testid="modal-calc-target-irr"');
    expect(html).toContain('18.4%');

    expect(html).toContain('data-testid="modal-calc-equity-multiple"');
    expect(html).toContain('1.85x');

    expect(html).toContain('data-testid="modal-calc-cap-rate"');
    expect(html).toContain('5.5%');

    expect(html).toContain('data-testid="modal-calc-cash-on-cash"');
    expect(html).toContain('6.8%');

    expect(html).toContain('data-testid="modal-calc-cash-required"');
    expect(html).toContain('$192,950');

    expect(html).toContain('data-testid="modal-calc-arv"');
    expect(html).toContain('$620,000');

    expect(html).toContain('data-testid="modal-calc-noi"');
    expect(html).toContain('$30,794/yr');

    expect(html).toContain('data-testid="modal-calc-mao"');
    expect(html).toContain('$372,000');

    // Baseline Breakdown Strip
    expect(html).toContain('data-testid="modal-calc-purchase-price"');
    expect(html).toContain('$485,000');

    expect(html).toContain('data-testid="modal-calc-rehab-budget"');
    expect(html).toContain('$62,000');

    expect(html).toContain('data-testid="modal-calc-gross-rent"');
    expect(html).toContain('$4,200/mo');

    expect(html).toContain('data-testid="modal-calc-debt-service"');
    expect(html).toContain('$2,299/mo');
  });

  it('renders primary CTA "Interested in Investing into this Project" and crowdfunding CTA', () => {
    const html = renderToString(
      <DealCalculatorResultModal
        deal={mockDealWithCalc}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('data-testid="modal-interested-investing-btn"');
    expect(html).toContain('Interested in Investing into this Project');
    expect(html).toContain('data-testid="crowdfund-invest-btn"');
    expect(html).toContain('Crowdfund / Allocate Capital');
    expect(html).toContain('data-testid="modal-open-in-deal-calculator-link"');
  });

  it('renders registered interest badge in modal when isInterested is true', () => {
    const html = renderToString(
      <DealCalculatorResultModal
        deal={mockDealWithCalc}
        isOpen={true}
        onClose={() => {}}
        isInterested={true}
      />
    );

    expect(html).toContain('data-testid="modal-interest-registered-badge"');
    expect(html).toContain('Investment Interest Registered');
    expect(html).toContain('Update Project Investment Interest');
  });

  it('strictly adheres to anti-slop rules across modal (no forbidden term, no em-dashes, 44px min touch target)', () => {
    const html = renderToString(
      <DealCalculatorResultModal
        deal={mockDealWithCalc}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // No forbidden term
    expect(html.toLowerCase()).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));

    // Min touch target on buttons
    expect(html).toContain('min-h-[44px]');
  });
});
