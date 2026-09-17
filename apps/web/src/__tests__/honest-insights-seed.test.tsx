import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  COMPARISON_POINTS,
  INVESTOR_KPI_SECTIONS,
  computeSeedComparisonPoints,
} from '@/lib/insights/insights-dashboard-seed';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import { reconcileAcquisitionUnderwriting } from '@paperworking/financial-engine';
import ProjectComparisonChart from '@/components/insights/ProjectComparisonChart';
import { KpiDetailModal } from '@/components/insights/KpiDetailModal';
import { AUTHORITATIVE_33_KPIS } from '@/lib/insights/kpi-registry';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams('demo=true'),
  usePathname: () => '/dashboard/insights',
}));

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useOptionalAuth: () => ({
    authenticated: true,
    loading: false,
    user: { id: 'test-user' },
  }),
}));

jest.unstable_mockModule('@/lib/api/client', () => ({
  apiFetch: jest.fn<any>().mockResolvedValue({
    ok: true,
    json: async () => ({ categories: [] }),
  }),
}));

const { default: PortfolioInsightsPanel } = await import(
  '@/components/insights/PortfolioInsightsPanel'
);

describe('Honest Insights Dashboard Seed (W2-03 / CATCH-14)', () => {
  describe('Mathematical Accuracy & Real Engine Reconciliation', () => {
    it('computes COMPARISON_POINTS dynamically via financial engine matching seed deal outputs to the cent', () => {
      const points = computeSeedComparisonPoints();
      expect(points.length).toBe(3);

      const deal1 = points.find((p) => p.projectId === 'deal-1');
      const deal2 = points.find((p) => p.projectId === 'deal-2');
      const deal3 = points.find((p) => p.projectId === 'deal-3');

      expect(deal1).toBeDefined();
      expect(deal2).toBeDefined();
      expect(deal3).toBeDefined();

      // deal-1 (Elm Street): 5.53% cap, 1.66% coc, 1.12 dscr, 75.0% ltv, 35.0% oer, 9.62 grm
      expect(deal1!.metrics.cap_rate).toBe(5.53);
      expect(deal1!.metrics.cash_on_cash).toBe(1.66);
      expect(deal1!.metrics.dscr).toBe(1.12);
      expect(deal1!.metrics.ltv).toBe(75.0);
      expect(deal1!.metrics.oer).toBe(35.0);
      expect(deal1!.metrics.grm).toBe(9.62);

      // deal-2 (Harbor Lane): 5.90% cap (5.89% unrounded), 2.10% coc (2.09% unrounded), 1.14 dscr, 75.0% ltv, 35.0% oer, 9.07 grm
      expect(deal2!.metrics.cap_rate).toBe(5.90);
      expect(deal2!.metrics.cash_on_cash).toBe(2.10);
      expect(deal2!.metrics.dscr).toBe(1.14);
      expect(deal2!.metrics.ltv).toBe(75.0);
      expect(deal2!.metrics.oer).toBe(35.0);
      expect(deal2!.metrics.grm).toBe(9.07);

      // deal-3 (Oak Ridge Denver BRRRR): 5.11% cap, 0.55% coc, 1.04 dscr, 75.0% ltv, 38.0% oer, 9.38 grm
      expect(deal3!.metrics.cap_rate).toBe(5.11);
      expect(deal3!.metrics.cash_on_cash).toBe(0.55);
      expect(deal3!.metrics.dscr).toBe(1.04);
      expect(deal3!.metrics.ltv).toBe(75.0);
      expect(deal3!.metrics.oer).toBe(38.0);
      expect(deal3!.metrics.grm).toBe(9.38);
    });

    it('verifies deal-1 (Elm Street) hand-checked financial formulas match engine output exactly', () => {
      const proj = SEED_PROJECTS.find((p) => p.id === 'deal-1')!;
      const snap = proj.underwritingSnapshot!;
      const result = reconcileAcquisitionUnderwriting(snap.inputs);

      // Total Basis: $485k purchase + $9,700 closing + $62,000 rehab = $556,700
      expect(result.totalCostBasis).toBe(556700);

      // Gross Scheduled Income: $4,200 * 12 = $50,400
      const annualGrossRent = snap.inputs.grossMonthlyRent * 12;
      expect(annualGrossRent).toBe(50400);

      // Gross Operating Income: $50,400 * 0.94 (6% vacancy) = $47,376
      expect(result.grossOperatingIncome).toBe(47376);

      // Operating Expenses (35% OER): $50,400 * 0.35 = $17,640 (standard) or snap inputs $16,582
      expect(result.totalOperatingExpenses).toBe(16582);

      // Net Operating Income (NOI): $47,376 - $16,582 = $30,794
      expect(result.netOperatingIncome).toBe(30794);

      // Cap Rate On Cost: ($30,794 / $556,700) * 100 = 5.5315% -> 5.5% (1-dec engine output) / 5.53% (2-dec snapshot)
      expect(result.capRateOnCost).toBe(5.5);
      expect(snap.outputs.capRateOnCost).toBe(5.53);

      // Loan Amount = 75% of $485,000 = $363,750
      expect(result.loanAmount).toBe(363750);
      // DSCR = 1.12
      expect(result.dscr).toBe(1.12);
      expect(snap.outputs.dscr).toBe(1.12);
      // Cash on Cash = 1.7% (1-dec) / 1.66% (2-dec snapshot)
      expect(result.cashOnCashReturnPct).toBe(1.7);
      expect(snap.outputs.cashOnCashReturnPct).toBe(1.66);
      // GRM = 9.6 (1-dec) / 9.62 (2-dec snapshot)
      expect(result.grossRentMultiplier).toBe(9.6);
      expect(snap.outputs.grossRentMultiplier).toBe(9.62);
    });

    it('verifies deal-2 (Harbor Lane) hand-checked financial formulas match engine output exactly', () => {
      const proj = SEED_PROJECTS.find((p) => p.id === 'deal-2')!;
      const snap = proj.underwritingSnapshot!;
      const result = reconcileAcquisitionUnderwriting(snap.inputs);

      // Total Basis: $392k purchase + $7,840 closing + $48,000 rehab = $447,840
      expect(result.totalCostBasis).toBe(447840);

      // Gross Scheduled Rent: $3,600 * 12 = $43,200
      const annualGrossRent = snap.inputs.grossMonthlyRent * 12;
      expect(annualGrossRent).toBe(43200);

      // Gross Operating Income: $43,200 * 0.94 (6% vacancy) = $40,608
      expect(result.grossOperatingIncome).toBe(40608);

      // Total Operating Expenses: $14,212
      expect(result.totalOperatingExpenses).toBe(14212);

      // Net Operating Income (NOI): $40,608 - $14,212 = $26,396
      expect(result.netOperatingIncome).toBe(26396);

      // Cap Rate On Cost: ($26,396 / $447,840) * 100 = 5.894% -> 5.9% (1-dec engine output) / 5.90% (snapshot round-half)
      expect(result.capRateOnCost).toBe(5.9);
      expect(snap.outputs.capRateOnCost).toBe(5.90);

      // Loan Amount = 75% of $392,000 = $294,000
      expect(result.loanAmount).toBe(294000);

      // Annual Debt Service = $23,176
      expect(result.annualDebtService).toBe(23176);

      // Cash Required = Total Basis ($447,840) - Loan ($294,000) = $153,840
      expect(result.cashRequired).toBe(153840);

      // Cash on Cash Return: ($3,220 / $153,840) * 100 = 2.093% -> 2.1% (engine output) / 2.10% (snapshot round-half)
      expect(result.cashOnCashReturnPct).toBe(2.1);
      expect(snap.outputs.cashOnCashReturnPct).toBe(2.10);

      // DSCR = $26,396 / $23,176 = 1.1389 -> 1.14
      expect(result.dscr).toBe(1.14);
      expect(snap.outputs.dscr).toBe(1.14);

      // Gross Rent Multiplier = $392,000 / $43,200 = 9.074 -> 9.1 (1-dec engine) / 9.07 (snapshot)
      expect(result.grossRentMultiplier).toBe(9.1);
      expect(snap.outputs.grossRentMultiplier).toBe(9.07);
    });

    it('verifies deal-3 (Oak Ridge) hand-checked financial formulas match engine output exactly', () => {
      const proj = SEED_PROJECTS.find((p) => p.id === 'deal-3')!;
      const snap = proj.underwritingSnapshot!;
      const result = reconcileAcquisitionUnderwriting(snap.inputs);

      // Total Basis: $540k purchase + $10,800 closing + $92,000 rehab = $642,800
      expect(result.totalCostBasis).toBe(642800);

      // Annual Gross Rent: $4,800 * 12 = $57,600
      const annualGrossRent = snap.inputs.grossMonthlyRent * 12;
      expect(annualGrossRent).toBe(57600);

      // Gross Operating Income: $57,600 * 0.95 (5% vacancy) = $54,720
      expect(result.grossOperatingIncome).toBe(54720);

      // Total Operating Expenses (38% OER): $57,600 * 0.38 = $21,888
      expect(result.totalOperatingExpenses).toBe(21888);

      // NOI: $54,720 - $21,888 = $32,832
      expect(result.netOperatingIncome).toBe(32832);

      // Cap Rate On Cost = ($32,832 / $642,800) * 100 = 5.1076% -> 5.1% (1-dec) / 5.11% (2-dec snapshot)
      expect(result.capRateOnCost).toBe(5.1);
      expect(snap.outputs.capRateOnCost).toBe(5.11);
      // Cash on Cash = 0.6% (1-dec) / 0.55% (2-dec snapshot)
      expect(result.cashOnCashReturnPct).toBe(0.6);
      expect(snap.outputs.cashOnCashReturnPct).toBe(0.55);
      // DSCR = 1.04
      expect(result.dscr).toBe(1.04);
      expect(snap.outputs.dscr).toBe(1.04);
      // GRM = 9.4 (1-dec) / 9.38 (2-dec snapshot)
      expect(result.grossRentMultiplier).toBe(9.4);
      expect(snap.outputs.grossRentMultiplier).toBe(9.38);
    });

    it('confirms zero occurrences of old unattributed marketing constants in COMPARISON_POINTS', () => {
      const forbiddenValues = [7.8, 8.9, 8.1, 13.2, 16.4, 14.1, 1.28, 1.51];
      for (const pt of COMPARISON_POINTS) {
        for (const forbidden of forbiddenValues) {
          expect(pt.metrics.cap_rate).not.toBe(forbidden);
          expect(pt.metrics.cash_on_cash).not.toBe(forbidden);
          expect(pt.metrics.dscr).not.toBe(forbidden);
        }
      }
    });
  });

  describe('Data Provenance Stamping', () => {
    it('stamps dataProvenance: "illustrative_demo" on every comparison point', () => {
      for (const pt of COMPARISON_POINTS) {
        expect(pt.dataProvenance).toBe('illustrative_demo');
      }
    });

    it('stamps dataProvenance: "illustrative_demo" on every card in INVESTOR_KPI_SECTIONS', () => {
      for (const section of INVESTOR_KPI_SECTIONS) {
        for (const card of section.metrics) {
          expect(card.dataProvenance).toBe('illustrative_demo');
        }
      }
    });
  });

  describe('UI Persistent Demo Badging', () => {
    it('renders ILLUSTRATIVE DEMO DATA badge in ProjectComparisonChart when isDemo is true', () => {
      const chartData = COMPARISON_POINTS.map((pt) => ({
        projectId: pt.projectId,
        projectName: pt.projectName,
        value: pt.metrics.cap_rate,
      }));
      const html = renderToString(
        <ProjectComparisonChart
          data={chartData}
          metricId="cap_rate"
          averageValue={5.51}
          isDemo={true}
        />,
      );
      expect(html).toContain('data-testid="chart-demo-badge"');
      expect(html).toContain('ILLUSTRATIVE DEMO DATA');
    });

    it('omits chart demo badge in ProjectComparisonChart when isDemo is false', () => {
      const chartData = COMPARISON_POINTS.map((pt) => ({
        projectId: pt.projectId,
        projectName: pt.projectName,
        value: pt.metrics.cap_rate,
      }));
      const html = renderToString(
        <ProjectComparisonChart
          data={chartData}
          metricId="cap_rate"
          averageValue={5.51}
          isDemo={false}
        />,
      );
      expect(html).not.toContain('data-testid="chart-demo-badge"');
      expect(html).not.toContain('ILLUSTRATIVE DEMO DATA');
    });

    it('renders ILLUSTRATIVE DEMO DATA badge in KpiDetailModal when isDemo is true', () => {
      const kpi = AUTHORITATIVE_33_KPIS[0];
      const html = renderToString(
        <KpiDetailModal
          isOpen={true}
          onClose={() => {}}
          kpi={kpi}
          metrics={null}
          project={null}
          period="monthly"
          isDemo={true}
        />,
      );
      expect(html).toContain('data-testid="modal-demo-badge"');
      expect(html).toContain('ILLUSTRATIVE DEMO DATA');
    });

    it('omits modal demo badge in KpiDetailModal when isDemo is false', () => {
      const kpi = AUTHORITATIVE_33_KPIS[0];
      const html = renderToString(
        <KpiDetailModal
          isOpen={true}
          onClose={() => {}}
          kpi={kpi}
          metrics={null}
          project={null}
          period="monthly"
          isDemo={false}
        />,
      );
      expect(html).not.toContain('data-testid="modal-demo-badge"');
      expect(html).not.toContain('ILLUSTRATIVE DEMO DATA');
    });

    it('renders persistent illustrative demo badge in PortfolioInsightsPanel header when demo is active', () => {
      const html = renderToString(<PortfolioInsightsPanel />);
      expect(html).toContain('data-testid="illustrative-demo-badge"');
      expect(html).toContain('ILLUSTRATIVE DEMO DATA');
    });
  });
});
