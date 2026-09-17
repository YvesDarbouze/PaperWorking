import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  AUTHORITATIVE_33_KPIS,
  getKpisByCategory,
  KPI_CATEGORIES,
  KPI_CATEGORY_METADATA,
} from '@/lib/insights/kpi-registry';
import { hasUnderwritingInputs } from '@/lib/insights/live-insights';
import PortfolioInsightsPanel, { shouldShowDemoLoader } from '@/components/insights/PortfolioInsightsPanel';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useOptionalAuth: () => ({ authenticated: true, loading: false }),
}));

describe('Insights 4-Category 33-KPI Command Surface (Prompt I2)', () => {
  describe('1. Category Mapping & Partitioning Invariants', () => {
    it('contains exactly 33 unique KPIs across the 4 authoritative categories', () => {
      expect(AUTHORITATIVE_33_KPIS).toHaveLength(33);

      const uniqueIds = new Set(AUTHORITATIVE_33_KPIS.map((k) => k.id));
      expect(uniqueIds.size).toBe(33);

      const uniqueNumbers = new Set(AUTHORITATIVE_33_KPIS.map((k) => k.number));
      expect(uniqueNumbers.size).toBe(33);

      const cat1 = getKpisByCategory('Financial Performance');
      const cat2 = getKpisByCategory('Operational Efficiency');
      const cat3 = getKpisByCategory('Asset and Portfolio Management');
      const cat4 = getKpisByCategory('Risk Management and Compliance Metrics');

      // Mandated distribution: 12 / 4 / 8 / 9 = 33
      expect(cat1).toHaveLength(12);
      expect(cat2).toHaveLength(4);
      expect(cat3).toHaveLength(8);
      expect(cat4).toHaveLength(9);
      expect(cat1.length + cat2.length + cat3.length + cat4.length).toBe(33);
    });

    it('verifies Category 1: Financial Performance contains the 12 core profitability/yield metrics', () => {
      const cat1 = getKpisByCategory('Financial Performance');
      const ids = cat1.map((k) => k.id);
      expect(ids).toEqual([
        'quick_cap_rate',
        'unlevered_irr',
        'levered_irr',
        'equity_multiple',
        'net_present_value',
        'cash_on_cash',
        'average_annual_cash_yield',
        'profit_margin_on_cost',
        'equity_required_gp_lp',
        'preferred_return_hurdle',
        'net_sales_proceeds',
        'investor_profit_at_exit',
      ]);
    });

    it('verifies Category 2: Operational Efficiency contains the 4 operational dynamics metrics', () => {
      const cat2 = getKpisByCategory('Operational Efficiency');
      const ids = cat2.map((k) => k.id);
      expect(ids).toEqual([
        'projected_gross_rent',
        'break_even_occupancy',
        'rent_growth_stress_test',
        'vacancy_rate_stress_test',
      ]);
    });

    it('verifies Category 3: Asset and Portfolio Management contains the 8 cost basis & valuation metrics', () => {
      const cat3 = getKpisByCategory('Asset and Portfolio Management');
      const ids = cat3.map((k) => k.id);
      expect(ids).toEqual([
        'gross_purchase_price',
        'rehab_budget',
        'total_cost_basis',
        'estimated_arv',
        'target_cash_required',
        'exit_sale_price',
        'exit_cap_sensitivity',
        'hold_period_sensitivity',
      ]);
    });

    it('verifies Category 4: Risk Management and Compliance Metrics contains the 9 solvency & debt metrics', () => {
      const cat4 = getKpisByCategory('Risk Management and Compliance Metrics');
      const ids = cat4.map((k) => k.id);
      expect(ids).toEqual([
        'initial_loan_amount',
        'dscr',
        'debt_yield',
        'ltv',
        'ltc',
        'max_supportable_loan',
        'monthly_debt_service',
        'interest_rate_type_spread',
        'amortization_balloon_term',
      ]);
      // Prompt mandated verification: DSCR and LTV must be in Risk Management
      expect(ids).toContain('dscr');
      expect(ids).toContain('ltv');
    });

    it('provides exact metadata titles, descriptions, and data-testid slugs', () => {
      expect(KPI_CATEGORIES).toEqual([
        'Financial Performance',
        'Operational Efficiency',
        'Asset and Portfolio Management',
        'Risk Management and Compliance Metrics',
      ]);

      expect(KPI_CATEGORY_METADATA['Financial Performance']).toEqual({
        id: 'financial-performance',
        name: 'Financial Performance',
        title: 'Financial Performance',
        count: 12,
        description:
          'Core profitability, yield, cash flow, and return multiples across the holding period.',
      });

      expect(KPI_CATEGORY_METADATA['Operational Efficiency']).toEqual({
        id: 'operational-efficiency',
        name: 'Operational Efficiency',
        title: 'Operational Efficiency',
        count: 4,
        description: 'Revenue capture, expense control, and operational breakeven dynamics.',
      });

      expect(KPI_CATEGORY_METADATA['Asset and Portfolio Management']).toEqual({
        id: 'asset-portfolio-management',
        name: 'Asset and Portfolio Management',
        title: 'Asset and Portfolio Management',
        count: 8,
        description: 'Cost basis, valuation, scale, diversification, and hold-period execution.',
      });

      expect(KPI_CATEGORY_METADATA['Risk Management and Compliance Metrics']).toEqual({
        id: 'risk-management-compliance',
        name: 'Risk Management and Compliance Metrics',
        title: 'Risk Management and Compliance Metrics',
        count: 9,
        description: 'Solvency, debt coverage, leverage exposure, and regulatory guardrails.',
      });
    });
  });

  describe('2. Project Underwriting Input Readiness Helper', () => {
    it('returns false for null, undefined, or empty projects', () => {
      expect(hasUnderwritingInputs(null)).toBe(false);
      expect(hasUnderwritingInputs(undefined)).toBe(false);
      expect(
        hasUnderwritingInputs({
          id: 'proj-empty',
          purchasePrice: 0,
        } as any),
      ).toBe(false);
    });

    it('returns true for projects with valid purchasePrice or underwriting structure', () => {
      expect(
        hasUnderwritingInputs({
          id: 'proj-1',
          purchasePrice: 485000,
        } as any),
      ).toBe(true);

      expect(
        hasUnderwritingInputs({
          id: 'proj-2',
          purchasePrice: 0,
          underwriting: {
            acquisition: { purchasePrice: 350000 },
          },
        } as any),
      ).toBe(true);
    });
  });

  describe('3. Demo Loader Governance (Production Invariant)', () => {
    it('strictly forbids demo loader in production environment', () => {
      expect(shouldShowDemoLoader(true, 'production')).toBe(false);
      expect(shouldShowDemoLoader(false, 'production')).toBe(false);
    });

    it('renders demo loader only when demo flag is actively set in non-production', () => {
      expect(shouldShowDemoLoader(true, 'development')).toBe(true);
      expect(shouldShowDemoLoader(false, 'development')).toBe(false);
      expect(shouldShowDemoLoader(true, 'test')).toBe(true);
      expect(shouldShowDemoLoader(false, 'test')).toBe(false);
    });
  });

  describe('4. Component Structural SSR Smoke Test', () => {
    it('renders PortfolioInsightsPanel cleanly without throwing', () => {
      const mockRouter = {
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
      };

      const html = renderToString(
        <AppRouterContext.Provider value={mockRouter as any}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <PortfolioInsightsPanel />
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>,
      );
      expect(html).toBeTruthy();
      expect(html).toContain('Insights');
    });
  });
});
