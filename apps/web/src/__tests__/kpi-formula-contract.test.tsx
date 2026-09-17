import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { AUTHORITATIVE_33_KPIS, getKpiById } from '@/lib/insights/kpi-registry';
import { INSIGHTS_TAB_CATEGORIES } from '@/lib/insights/insights-dashboard-seed';
import { PLAYBOOK_CATEGORIES } from '@/lib/marketing/playbook-metrics-data';
import { KpiDetailModal } from '@/components/insights/KpiDetailModal';
import type { ProjectMetricsResult, MetricValue } from '@paperworking/financial-engine';

const mv = (value: number | null, projected = false): MetricValue => ({
  value,
  projected,
  computedAt: new Date('2025-01-01'),
});

const mockMetrics: ProjectMetricsResult = {
  projectId: 'test-deal',
  asOfDate: new Date('2025-01-01'),
  scorecard: {
    noi: mv(12485),
    capRate: mv(4.5),
    cashOnCash: mv(-7.96),
    irr: mv(14.8, true),
    cashFlow: mv(-4444),
    grm: mv(11.6),
    dscr: mv(0.74),
    occupancyRate: mv(100),
    expenseRatio: mv(46.4),
    longTermAppreciation: mv(3.5, true),
  },
  insights: {
    financial: {
      ltv: mv(68.5),
      equityToValue: mv(31.5),
      interestCoverageRatio: mv(1.82),
      roi: mv(24.5, true),
      capex: mv(45000),
      goi: mv(23280),
      aar: mv(4.9, true),
      equityMultiple: mv(1.84, true),
      revenueGrowth: mv(4.2, true),
    },
    operational: {
      tenantTurnover: mv(12.5, true),
      averageRentPerProperty: mv(2000),
      leaseRenewalRate: mv(85, true),
      maintenanceCostPerUnit: mv(208),
      dom: mv(30),
      constructionCostPerSqFt: mv(45),
    },
    assetPortfolio: {
      portfolioValueGrowth: mv(5.8, true),
      paybackPeriod: mv(6.2, true),
      yoyVarianceAvgSoldPrice: mv(3.2, true),
      soldHomesPerInventory: mv(0.18, true),
      demandGrowth: mv(4.5, true),
    },
    marketingSales: {
      listingToMeetingRatio: mv(24.5, true),
      averageCommissionPerSale: mv(5500, true),
    },
    riskCompliance: {
      riskAssessmentScore: mv(25),
      complianceRate: mv(100),
    },
  },
  derived: {
    monthlyMortgagePayment: 1410.78,
    monthlyInterest: 948.75,
    monthlyPrincipal: 462.03,
    totalDebtService: 16929.36,
    adjustedBasis: 350000,
    totalCostBasis: 395000,
    capitalGainLoss: 75000,
    holdingPeriodMonths: 60,
    annualDepreciation: 12727.27,
    debtYield: 9.59,
    breakEvenOccupancy: 67.14,
    ltc: 72.5,
    maxSupportableLoan: 275000,
    unleveredIrr: 9.2,
    leveredIrr: 14.8,
    balloonBalance: 0,
    estimatedARV: 437500,
    npv: 42000,
    profitMarginOnCost: 25.0,
    exitValuation: 500000,
    netSalesProceeds: 185000,
    investorProfitAtExit: 95000,
    interestRate: 6.5,
    preferredReturn: 8.0,
    annualRentGrowth: 3.0,
    loanAmount: 262500,
    totalCashInvested: 132500,
    lpEquity: 119250,
    gpEquity: 13250,
    lpEquityPct: 90,
    gpEquityPct: 10,
    gpPromotePct: 20,
    lpIrr: 14.2,
    gpIrr: 22.5,
    lpEquityMultiple: 1.82,
    gpEquityMultiple: 2.45,
  },
};

describe('KPI Formula Contract & Registry Documentation (Prompt K7)', () => {
  it('enforces that all 33 authoritative KPIs have non-empty formula and definitionSource', () => {
    expect(AUTHORITATIVE_33_KPIS).toHaveLength(33);

    AUTHORITATIVE_33_KPIS.forEach((kpi) => {
      expect(typeof kpi.formula).toBe('string');
      expect(kpi.formula.trim().length).toBeGreaterThan(0);

      expect(typeof kpi.definitionSource).toBe('string');
      expect(kpi.definitionSource.trim().length).toBeGreaterThan(0);

      expect(typeof kpi.definition).toBe('string');
      expect(kpi.definition.trim().length).toBeGreaterThan(10);
    });
  });

  it('enforces exact category headings across seed and playbook metadata', () => {
    const requiredHeadings = [
      'Financial Performance',
      'Operational Efficiency',
      'Asset and Portfolio Management',
      'Risk Management and Compliance Metrics',
    ];

    const tabNames = INSIGHTS_TAB_CATEGORIES.map((c) => c.name);
    requiredHeadings.forEach((heading) => {
      expect(tabNames).toContain(heading);
    });

    const playbookLabels = PLAYBOOK_CATEGORIES.map((c) => c.label);
    expect(playbookLabels).toContain('Financial Performance');
    expect(playbookLabels).toContain('Operational Efficiency');
    expect(playbookLabels).toContain('Asset and Portfolio Management');
    expect(playbookLabels).toContain('Risk Management and Compliance Metrics');
  });

  it('enforces absolute invariant: zero occurrences of forbidden terminology', () => {
    const serializedRegistry = JSON.stringify(AUTHORITATIVE_33_KPIS).toLowerCase();
    expect(serializedRegistry).not.toContain('sponsor');
  });

  it('resolves valid substituted formula string for all 33 KPIs', () => {
    AUTHORITATIVE_33_KPIS.forEach((kpi) => {
      const substituted = kpi.resolveFormulaWithValues(mockMetrics, 'annual');
      expect(typeof substituted).toBe('string');
      expect(substituted.trim().length).toBeGreaterThan(0);
      expect(substituted).not.toBe('—');
    });
  });

  it('renders "How this is calculated" with formula, definitionSource, and substituted values in KpiDetailModal for all 33 KPIs', () => {
    AUTHORITATIVE_33_KPIS.forEach((kpi) => {
      const html = renderToString(
        <KpiDetailModal
          isOpen={true}
          onClose={() => {}}
          kpi={kpi}
          metrics={mockMetrics}
          project={null}
          period="annual"
        />,
      );

      expect(html).toContain('data-testid="modal-how-calculated"');
      expect(html).toContain('How this is calculated');
      expect(html).toContain('data-testid="modal-canonical-formula"');
      expect(html).toContain('data-testid="modal-formula-substituted"');
      expect(html).toContain('data-testid="modal-definition-source"');
      const escapedSource = kpi.definitionSource.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
      expect(html).toContain(escapedSource);
    });
  });

  it('renders Supporting Derived Metrics row for Phase 1 return and Phase 2 debt metrics (NOI, GRM, OER, Interest Coverage)', () => {
    // KPI #7: Quick Cap Rate
    const kpi7 = getKpiById('quick_cap_rate');
    expect(kpi7).toBeDefined();
    const html7 = renderToString(
      <KpiDetailModal
        isOpen={true}
        onClose={() => {}}
        kpi={kpi7!}
        metrics={mockMetrics}
        project={null}
        period="annual"
      />,
    );
    expect(html7).toContain('data-testid="modal-derived-metrics"');
    expect(html7).toContain('Gross Rent Multiplier (GRM)');
    expect(html7).toContain('Operating Expense Ratio (OER)');
    expect(html7).toContain('Net Operating Income (NOI)');

    // KPI #15: DSCR
    const kpi15 = getKpiById('dscr');
    expect(kpi15).toBeDefined();
    const html15 = renderToString(
      <KpiDetailModal
        isOpen={true}
        onClose={() => {}}
        kpi={kpi15!}
        metrics={mockMetrics}
        project={null}
        period="annual"
      />,
    );
    expect(html15).toContain('data-testid="modal-derived-metrics"');
    expect(html15).toContain('Interest Coverage Ratio');
    expect(html15).toContain('Net Operating Income (NOI)');
    expect(html15).toContain('Total Annual Debt Service');
  });
});
