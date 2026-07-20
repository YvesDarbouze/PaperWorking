/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActualScorecard } from '../components/project/ActualScorecard';
import type { Project } from '@/types/schema';

const mockProject: Project = {
  id: 'proj-scorecard-123',
  address: '123 Comparison Ave',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'RENT',
  createdAt: new Date().toISOString(),
  financials: {
    purchasePrice: 200000,
    estimatedARV: 250000,
    loanAmount: 150000,
    ownershipPercentage: 80,
    projectedRehabCost: 30000,
    estimatedTimelineDays: 120,
    annualAppreciationPercent: 4
  }
} as any;

const mockLiveMetrics = {
  irr: 0.15,
  annualizedAppreciation: 5.2,
  grossRentMultiplier: 8.5,
  kpi33: {
    IRR: { projected: 0.12, actual: 0.16 },
    NOI: { projected: 18000, actual: 20000 },
    COC: { projected: 8.0, actual: 9.5 },
    CAP_RATE: { projected: 6.5, actual: 7.2 },
    CASH_FLOW: { projected: 5000, actual: 6000 },
    OER: { projected: 45.0, actual: 42.0 },
    OCCUPANCY: { projected: 93.0, actual: 95.0 }
  }
} as any;

const mockAutopsy = {
  projectedNetProfit: 40000,
  netProfit: 45000,
  projectedTotalCost: 210000,
  roi: 21.4,
  grossSalePrice: 260000,
  purchasePrice: 200000,
  actualRehabCost: 28000,
  holdDays: 110,
  annualizedIrr: 16.0,
  coc: 9.5,
  profitMargin: 17.3
};

describe('ActualScorecard component', () => {
  it('renders projected IRR and labels it correctly when not realized (RENT strategy)', () => {
    render(
      <ActualScorecard
        project={mockProject}
        strategy="Rent"
        liveMetrics={mockLiveMetrics}
        autopsy={mockAutopsy}
        metricsScope="property"
        setMetricsScope={jest.fn()}
        isRealized={false}
      />
    );

    // Verify Title
    expect(screen.getByText('Actual Scorecard')).toBeDefined();
    
    // Verify label and projected IRR (0.15 * 100 = 15.0% or mockLiveMetrics.irr)
    expect(screen.getByText('Projected IRR')).toBeDefined();
    expect(screen.getByText('12.0')).toBeDefined();
    expect(screen.getByText('Acquisition Projection')).toBeDefined();
    expect(screen.getByText('12.0%')).toBeDefined();
  });

  it('renders realized IRR and variance badge when realized', () => {
    render(
      <ActualScorecard
        project={mockProject}
        strategy="Rent"
        liveMetrics={mockLiveMetrics}
        autopsy={mockAutopsy}
        metricsScope="property"
        setMetricsScope={jest.fn()}
        isRealized={true}
      />
    );

    expect(screen.getByText('Actual IRR')).toBeDefined();
    // 0.16 * 100 = 16.0% actual IRR
    expect(screen.getByText('16.0')).toBeDefined();
    // Variance +4.0% (+16.0% actual - 12.0% projected)
    expect(screen.getByText('+4.0%')).toBeDefined();
  });

  it('renders side-by-side rows for Rent/Lease KPIs', () => {
    render(
      <ActualScorecard
        project={mockProject}
        strategy="Rent"
        liveMetrics={mockLiveMetrics}
        autopsy={mockAutopsy}
        metricsScope="property"
        setMetricsScope={jest.fn()}
        isRealized={true}
      />
    );

    expect(screen.getByText('Net Operating Income (NOI)')).toBeDefined();
    expect(screen.getByText('$18,000')).toBeDefined(); // projected
    expect(screen.getByText('$20,000')).toBeDefined(); // actual
    
    expect(screen.getByText('Cash-on-Cash Return')).toBeDefined();
    expect(screen.getByText('8.0%')).toBeDefined();
    expect(screen.getByText('9.5%')).toBeDefined();
  });

  it('renders side-by-side rows for Sell KPIs', () => {
    render(
      <ActualScorecard
        project={mockProject}
        strategy="Sell"
        liveMetrics={mockLiveMetrics}
        autopsy={mockAutopsy}
        metricsScope="property"
        setMetricsScope={jest.fn()}
        isRealized={true}
      />
    );

    expect(screen.getByText('Net Profit')).toBeDefined();
    expect(screen.getByText('$40,000')).toBeDefined(); // projected
    expect(screen.getByText('$45,000')).toBeDefined(); // actual

    expect(screen.getByText('Hold Timeline')).toBeDefined();
    expect(screen.getByText('120 days')).toBeDefined(); // projected
    expect(screen.getByText('110 days')).toBeDefined(); // actual
  });

  it('scales values by ownership share in myShare mode', () => {
    render(
      <ActualScorecard
        project={mockProject}
        strategy="Sell"
        liveMetrics={mockLiveMetrics}
        autopsy={mockAutopsy}
        metricsScope="myShare"
        setMetricsScope={jest.fn()}
        isRealized={true}
      />
    );

    // 80% ownership of $45,000 actual is $36,000
    expect(screen.getByText('$36,000')).toBeDefined();
    // 80% ownership of $40,000 projected is $32,000
    expect(screen.getByText('$32,000')).toBeDefined();
  });
});
