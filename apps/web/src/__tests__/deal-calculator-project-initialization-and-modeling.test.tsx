import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockPush = jest.fn();
const mockFetchSessionProfile = jest.fn<() => Promise<{
  authenticated: boolean;
  accountType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/deal-calculator',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);
const { default: StartProjectFromCalculatorModal } = await import(
  '../../components/marketing/deal-calculator/StartProjectFromCalculatorModal.js'
);
const { default: ClosingCostsModal } = await import(
  '../../components/marketing/deal-calculator/ClosingCostsModal.js'
);
const { default: StrategyOutputsCard } = await import(
  '../../components/marketing/deal-calculator/StrategyOutputsCard.js'
);

describe('Requirement 5: Deal Calculator Project Initialization & Financial Modeling Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
  });

  describe('1. Start Project from Deal Calculator Process & Interface', () => {
    it('renders the "Start Project from Deal" button in top action bar', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="start-project-from-calculator-btn"');
      expect(html).toContain('Start Project from Deal');
    });

    it('renders StartProjectFromCalculatorModal with address serial number and 33 Datapoints baseline', () => {
      const html = renderToString(
        <StartProjectFromCalculatorModal
          isOpen={true}
          onClose={() => {}}
          address="742 Evergreen Terrace, Springfield, OR 97477"
          strategy="buy_and_hold_rental"
          purchasePrice={450000}
          rehabBudget={35000}
          arv={580000}
          grossRentMonthly={3400}
          noi={26520}
          projectedIrrPct={16.8}
          capRateOnCost={5.4}
          cashOnCashReturnPct={8.9}
          loanAmount={337500}
          cashRequired={156500}
          persistedSnapshotId="snap-springfield-01"
          isCreatingProject={false}
          projectCreationError={null}
          onLaunchProjectWorkspace={() => {}}
          onOpenProjectWizard={() => {}}
        />
      );

      expect(html).toContain('data-testid="start-project-modal"');
      expect(html).toContain('data-testid="start-project-street-address"');
      expect(html).toContain('742 Evergreen Terrace');
      expect(html).toContain('data-testid="start-project-full-address"');
      expect(html).toContain('742 Evergreen Terrace, Springfield, OR 97477');
      expect(html).toContain('33 Datapoints Baseline Carry-Over');
      expect(html).toContain('data-testid="confirm-launch-project-btn"');
      expect(html).toContain('Launch Project Workspace');
      expect(html).toContain('data-testid="confirm-open-wizard-btn"');
      expect(html).toContain('Configure in Full Wizard');
    });
  });

  describe('2. Purchase & Acquisition Cost Tracking with Itemized Closing Costs', () => {
    it('renders purchase price, arv, rehab budget, and closing costs input with itemized worksheet trigger', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="purchase-price-input"');
      expect(html).toContain('data-testid="arv-input"');
      expect(html).toContain('data-testid="rehab-input"');
      expect(html).toContain('data-testid="open-rehab-worksheet-btn"');
      expect(html).toContain('data-testid="closing-costs-pct-input"');
      expect(html).toContain('data-testid="open-closing-costs-modal-btn"');
      expect(html).toContain('data-testid="total-cost-basis-display"');
      expect(html).toContain('Total Acquisition Basis');
    });

    it('renders ClosingCostsModal with legal, inspection, title, and loan line items', () => {
      const html = renderToString(
        <ClosingCostsModal
          isOpen={true}
          onClose={() => {}}
          purchasePrice={450000}
          currentClosingCostsPct={2.0}
          onApplyClosingCosts={() => {}}
        />
      );

      expect(html).toContain('data-testid="closing-costs-modal"');
      expect(html).toContain('Title Insurance &amp; Escrow Fees');
      expect(html).toContain('Legal &amp; Attorney Fees');
      expect(html).toContain('Property Inspection &amp; Environmental');
      expect(html).toContain('Appraisal &amp; Boundary Survey');
      expect(html).toContain('Loan Origination &amp; Underwriting');
      expect(html).toContain('Government Recording &amp; Transfer Taxes');
      expect(html).toContain('data-testid="apply-closing-costs-btn"');
    });
  });

  describe('3. Financing Inputs (Down Payment %, LTV, Rates, Loan Terms)', () => {
    it('renders synchronized Down Payment % and LTV % inputs and loan term quick selectors', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="down-payment-pct-input"');
      expect(html).toContain('data-testid="ltv-pct-input"');
      expect(html).toContain('data-testid="interest-rate-input"');
      expect(html).toContain('data-testid="opex-ratio-input"');
      expect(html).toContain('data-testid="loan-term-30yr-btn"');
      expect(html).toContain('data-testid="loan-term-20yr-btn"');
      expect(html).toContain('data-testid="loan-term-15yr-btn"');
      expect(html).toContain('data-testid="loan-term-10yr-btn"');
    });
  });

  describe('4. Income & Expense Projections (EGI Waterfall & Ancillary Income)', () => {
    it('renders ancillary income input and Effective Gross Income (EGI) card with NOI', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="gross-rent-input"');
      expect(html).toContain('data-testid="other-income-input"');
      expect(html).toContain('data-testid="effective-gross-income-card"');
      expect(html).toContain('Gross Potential Rent');
      expect(html).toContain('Ancillary Income');
      expect(html).toContain('Effective Gross Income');
      expect(html).toContain('Net Operating Income (NOI)');
      expect(html).toContain('data-testid="noi-output-metric"');
    });
  });

  describe('5. Financial Performance Metrics (CoC, Cap Rate, NOI, IRR)', () => {
    it('renders all 4 primary institutional KPI cards', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="coc-output-metric"');
      expect(html).toContain('data-testid="cap-rate-output-metric"');
      expect(html).toContain('data-testid="noi-kpi-metric"');
      expect(html).toContain('data-testid="irr-output-metric"');
    });
  });

  describe('6. Strategy-Specific Analysis (Buy & Hold, Fix & Flip with MAO, BRRRR)', () => {
    const mockCalculations: any = {
      monthlyNetCashFlow: 650,
      netOperatingIncome: 32000,
      cashOnCashReturnPct: 8.5,
      capRateOnCost: 6.2,
      dscr: 1.35,
      grossRentMultiplier: 8.2,
      estimatedExitValue: 620000,
      maximumAllowableOffer70Pct: 375000,
      projectedFlipProfit: 48000,
      totalCostBasis: 485000,
      cashRequired: 140000,
      fixAndFlip: {
        isProfitable: true,
        netFlipProfit: 48000,
        profitMarginOnArvPct: 7.4,
        roiOnTotalCostPct: 9.9,
        annualizedRoiPct: 19.8,
        totalCostBasis: 485000,
        totalHoldingCosts: 12000,
        holdingCostDebtTotal: 8000,
        holdingCostOperationsTotal: 4000,
        estimatedSellingCosts: 36000,
        shortTermTaxRatePct: 25,
        estimatedShortTermTax: 12000,
        afterTaxNetFlipProfit: 36000,
      },
      brrrr: {
        isPerfectBrrrr: true,
        capitalRecoveredPct: 100,
        newRefinanceLoanAmount: 487500,
        refinanceClosingCostsAmount: 12188,
        cashOutGrossProceeds: 487500,
        netCashLeftInDeal: 0,
        initialCashRequired: 140000,
        postRefiCashOnCashReturnPct: null,
        postRefiMonthlyNetCashFlow: 420,
      },
    };

    it('renders Buy & Hold Rental card with cash flow, NOI, CoC, and Cap Rate', () => {
      const html = renderToString(
        <StrategyOutputsCard strategy="buy_and_hold_rental" calculations={mockCalculations} />
      );

      expect(html).toContain('data-testid="buy-and-hold-outputs-card"');
      expect(html).toContain('Monthly Cash Flow');
      expect(html).toContain('Annual NOI');
      expect(html).toContain('Cash-on-Cash');
      expect(html).toContain('Cap Rate on Cost');
    });

    it('renders Fix & Flip card with Maximum Allowable Offer (MAO / 70% rule) and short-term capital gains tax projection', () => {
      const html = renderToString(
        <StrategyOutputsCard strategy="flip" calculations={mockCalculations} />
      );

      expect(html).toContain('data-testid="flip-outputs-card"');
      expect(html).toContain('70% Rule MAO');
      expect(html).toContain('$375,000');
      expect(html).toContain('data-testid="flip-tax-projection"');
      expect(html).toContain('Short-Term Capital Gains Projection');
      expect(html).toContain('data-testid="flip-after-tax-profit"');
      expect(html).toContain('$36,000');
    });

    it('renders BRRRR card with cash-out refinance and equity extraction metrics', () => {
      const html = renderToString(
        <StrategyOutputsCard strategy="brrrr" calculations={mockCalculations} />
      );

      expect(html).toContain('data-testid="brrrr-outputs-card"');
      expect(html).toContain('Cash-Out Refinance');
      expect(html).toContain('Infinite Return');
    });
  });

  describe('7. Advanced Risk & Forward-Looking Tools', () => {
    it('renders "What-If" Sensitivity Scenarios panel with vacancy, rent variance toggles, and direct inputs', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="what-if-scenarios-panel"');
      expect(html).toContain('Sensitivity &amp; “What-If” Stress Testing');
      expect(html).toContain('data-testid="what-if-vacancy-5-btn"');
      expect(html).toContain('data-testid="what-if-vacancy-10-btn"');
      expect(html).toContain('data-testid="what-if-vacancy-input"');
      expect(html).toContain('data-testid="what-if-rent-delta--10-btn"');
      expect(html).toContain('data-testid="what-if-rent-delta-10-btn"');
      expect(html).toContain('data-testid="what-if-rent-delta-input"');
    });

    it('renders Exit Strategy Planning panel with 5-Yr, 10-Yr, and 20-Yr wealth horizons', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="exit-strategy-planning-panel"');
      expect(html).toContain('Exit Strategy Planning &amp; Wealth Horizon');
      expect(html).toContain('data-testid="exit-horizon-5yr-btn"');
      expect(html).toContain('data-testid="exit-horizon-10yr-btn"');
      expect(html).toContain('data-testid="exit-horizon-20yr-btn"');
      expect(html).toContain('Future Property Value');
      expect(html).toContain('Principal Paydown');
      expect(html).toContain('Total Equity at Exit');
      expect(html).toContain('Total Projected Multi-Year ROI');
    });
  });
});
