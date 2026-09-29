import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HoldWorkspaceView from '../../components/projects/HoldWorkspaceView';
import ExitWorkspaceView from '../../components/projects/ExitWorkspaceView';
import PropertySatelliteViewer from '../../components/maps/PropertySatelliteViewer';
import PropertyImageGallery from '../../components/projects/PropertyImageGallery';
import DealCalculatorResultModal from '../../components/marketplace/DealCalculatorResultModal';
import DealCrowdfundModal from '../../components/marketplace/DealCrowdfundModal';
import type { ProjectWorkspace } from '../../lib/projects/types';
import type { DealCardData } from '../../components/marketplace/DealCard';

const mockProject: ProjectWorkspace = {
  id: 'proj-reil-test-1',
  project_id: 'proj-reil-test-1',
  propertyName: '1247 East 7th Street Triplex',
  address: '1247 East 7th Street, Austin, TX 78702',
  property_address: '1247 East 7th Street, Austin, TX 78702',
  city: 'Austin',
  currentPhase: 'hold',
  phase: 'hold',
  status: 'In Rehabilitation',
  dispositionType: 'RENT',
  purchasePrice: 485000,
  purchase_price: 485000,
  rehab_costs: 65000,
  exit_strategy: 'Refinance & Retain (BRRRR)',
  entity_type: 'Texas Series LLC',
  storage_used_bytes: 12000000,
  storageQuotaBytes: 524288000,
  phase_completion_pct: 45,
  dealId: 'deal-tx-austin-1247',
  dealSlug: '1247-east-7th-street-austin-tx',
  dealAddress: '1247 East 7th Street, Austin, TX 78702',
  todos: [],
  documents: [],
  funding: {
    loanAmount: 363750,
    interestRatePct: 6.875,
    amortizationYears: 30,
    downPayment: 121250,
    closingCosts: 9700,
    actualCashToClose: 130950,
    fundingStatus: 'Closed & Funded',
    lenderName: 'Apex Commercial Lending',
    loanType: 'Bridge / Rehab Loan',
    monthlyDebtService: 2390,
  },
  underwriting: {
    acquisition: {
      purchasePrice: 485000,
      rehabBudget: 65000,
      buyerClosingCosts: 9700,
      estimatedARV: 710000,
    },
    rentRoll: {
      grossScheduledRent: 4200,
      otherIncome: 150,
      vacancyRate: 5,
      operatingExpenseRatio: 35,
    },
    debt: {
      loanAmount: 363750,
      targetLTV: 75,
      interestRate: 6.875,
      interestRateType: 'fixed',
      amortizationYears: 30,
      ioPeriodMonths: 0,
    },
    hurdles: {
      minDSCR: 1.25,
      exitCapSensitivityBps: 50,
      rentShockPct: 5,
      vacancyStressRange: [5, 10],
    },
    exit: {
      holdPeriodYears: 2,
      exitCapRate: 6.5,
      costOfSale: 9700,
      annualRentGrowth: 3.0,
      annualExpenseGrowth: 2.5,
    },
  },
};

const mockDeal: DealCardData = {
  id: 'deal-market-1',
  slug: '1247-east-7th-street-austin-tx',
  name: '1247 East 7th Street Triplex',
  propertyName: '1247 East 7th Street Triplex',
  address: '1247 East 7th Street, Austin, TX 78702',
  city: 'Austin',
  state: 'TX',
  assetClass: 'Multifamily',
  subStrategy: 'Value-Add / BRRRR',
  purchasePrice: 485000,
  fundingTarget: 175000,
  committedAmount: 119000,
  investorCount: 8,
  targetIrr: 19.2,
  equityMultiple: 1.88,
  minInvestment: 25000,
  status: 'active',
  dealType: 'syndication',
  creatorName: 'Apex Capital Partners',
  isVerifiedOperator: true,
};

describe('REIL Phase 3: HoldWorkspaceView Component', () => {
  it('renders Target Property Deal Serial Identification Card and financial indicators', () => {
    const html = renderToString(
      <HoldWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
    );

    expect(html).toContain('data-testid="hold-workspace-view"');
    expect(html).toContain('data-testid="hold-deal-header-card"');
    expect(html).toContain('REIL Phase 03: Hold Workspace');
    expect(html).toContain('deal-tx-austin-1247');
    expect(html).toContain('1247 East 7th Street, Austin, TX 78702');
    expect(html).toContain('Rehab Progress');
    expect(html).toContain('Monthly Carrying Burn');
  });

  it('renders sub-navigation tabs for Renovation, Carrying Costs, and Asset Management', () => {
    const html = renderToString(
      <HoldWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
    );

    expect(html).toContain('data-testid="hold-tab-renovation"');
    expect(html).toContain('data-testid="hold-tab-financials"');
    expect(html).toContain('data-testid="hold-tab-management"');
    expect(html).toContain('Scope of Work (SOW) Line Item Execution');
    expect(html).toContain('Municipal Building Permits');
    expect(html).toContain('Lender Draw Requests');
  });
});

describe('REIL Phase 4: ExitWorkspaceView Component & Recalculation Engine', () => {
  it('renders 5 Institutional Exit Strategy routes with State Override capability', () => {
    const html = renderToString(
      <ExitWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
    );

    expect(html).toContain('data-testid="exit-workspace-view"');
    expect(html).toContain('data-testid="exit-deal-header-card"');
    expect(html).toContain('REIL Phase 04: Exit');
    expect(html).toContain('data-testid="exit-route-outright_sale"');
    expect(html).toContain('data-testid="exit-route-refinance_retain"');
    expect(html).toContain('data-testid="exit-route-condo_selloff"');
    expect(html).toContain('data-testid="exit-route-lease_option"');
    expect(html).toContain('data-testid="exit-route-1031_exchange"');
  });

  it('renders Net Cash Proceeds, Terminal IRR, and Equity Multiple KPIs', () => {
    const html = renderToString(
      <ExitWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
    );

    expect(html).toContain('Net Cash Proceeds');
    expect(html).toContain('Terminal IRR');
    expect(html).toContain('Equity Multiple');
    expect(html).toContain('Disposition Capital Waterfall');
    expect(html).toContain('Tax Basis');
    expect(html).toContain('data-testid="finalize-lifecycle-btn"');
    expect(html).toContain('data-testid="export-investor-packet-btn"');
  });
});

describe('PropertySatelliteViewer Component', () => {
  it('renders satellite container with coordinates overlay and Google Maps external action', () => {
    const html = renderToString(
      <PropertySatelliteViewer
        address="1247 East 7th Street, Austin, TX 78702"
        lat={30.2672}
        lng={-97.7431}
        defaultZoom={18}
      />
    );

    expect(html).toContain('data-testid="property-satellite-viewer"');
    expect(html).toContain('data-testid="satellite-map-image"');
    expect(html).toContain('Google Maps');
  });
});

describe('PropertyImageGallery Component', () => {
  it('renders gallery header, upload trigger, and default satellite asset', () => {
    const html = renderToString(
      <PropertyImageGallery
        projectId="proj-reil-test-1"
        dealAddress="1247 East 7th Street, Austin, TX 78702"
        lat={30.2672}
        lng={-97.7431}
      />
    );

    expect(html).toContain('data-testid="property-image-gallery"');
    expect(html).toContain('data-testid="upload-property-photo-btn"');
    expect(html).toContain('Property Imagery');
    expect(html).toContain('Satellite Parcel View');
  });
});

describe('Deals Marketplace Modals', () => {
  it('renders DealCalculatorResultModal with real underwriting metrics and crowdfund CTA', () => {
    const html = renderToString(
      <DealCalculatorResultModal
        deal={mockDeal}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(html).toContain('data-testid="deal-calculator-result-modal"');
    expect(html).toContain('1247 East 7th Street Triplex');
    expect(html).toContain('Cap Rate on Cost');
    expect(html).toContain('Target IRR');
    expect(html).toContain('Cash-on-Cash');
    expect(html).toContain('Net Operating Income');
    expect(html).toContain('data-testid="crowdfund-invest-btn"');
  });

  it('renders DealCrowdfundModal with investment check sizes and accreditation check', () => {
    const html = renderToString(
      <DealCrowdfundModal
        deal={mockDeal}
        isOpen={true}
        onClose={jest.fn()}
        onCommitSuccess={jest.fn()}
      />
    );

    expect(html).toContain('data-testid="deal-crowdfund-modal"');
    expect(html).toContain('$25,000');
    expect(html).toContain('$50,000');
    expect(html).toContain('$100,000');
    expect(html).toContain('SEC Rule 501');
    expect(html).toContain('Private Placement Memorandum (PPM)');
  });
});
