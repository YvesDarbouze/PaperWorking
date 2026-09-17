import {
  AUTHORITATIVE_33_KPIS,
  getKpiById,
  getKpisByPhase,
  PHASE_HEADERS,
} from '@/lib/insights/kpi-registry';
import type { ProjectMetricsResult } from '@paperworking/financial-engine';
import type { ProjectSummary } from '@/lib/projects/types';

describe('Authoritative 33 Underwriting KPI Registry', () => {
  test('Registry contains exactly 33 KPIs', () => {
    expect(AUTHORITATIVE_33_KPIS).toHaveLength(33);
  });

  test('KPIs are grouped strictly into 4 phases: 8 / 10 / 8 / 7', () => {
    const p1 = getKpisByPhase(1);
    const p2 = getKpisByPhase(2);
    const p3 = getKpisByPhase(3);
    const p4 = getKpisByPhase(4);

    expect(p1).toHaveLength(8);
    expect(p2).toHaveLength(10);
    expect(p3).toHaveLength(8);
    expect(p4).toHaveLength(7);

    expect(PHASE_HEADERS[1].count).toBe(8);
    expect(PHASE_HEADERS[2].count).toBe(10);
    expect(PHASE_HEADERS[3].count).toBe(8);
    expect(PHASE_HEADERS[4].count).toBe(7);
  });

  test('KPI numbers run consecutively from 1 to 33', () => {
    AUTHORITATIVE_33_KPIS.forEach((kpi, idx) => {
      expect(kpi.number).toBe(idx + 1);
    });
  });

  test('Strict Invariant: zero occurrence of forbidden terminology across the entire registry', () => {
    const jsonString = JSON.stringify(AUTHORITATIVE_33_KPIS).toLowerCase();
    expect(jsonString).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));
  });

  test('Every KPI provides non-empty definition, formulaTemplate, and input provenance', () => {
    AUTHORITATIVE_33_KPIS.forEach((kpi) => {
      expect(kpi.name.trim().length).toBeGreaterThan(0);
      expect(kpi.definition.trim().length).toBeGreaterThan(10);
      expect(kpi.formulaTemplate.trim().length).toBeGreaterThan(0);
      expect(kpi.inputs.length).toBeGreaterThan(0);
      kpi.inputs.forEach((inp) => {
        expect(inp.name).toBeDefined();
        expect(inp.source).toBeDefined();
        expect(inp.editRoute).toBeDefined();
      });
    });
  });

  test('Live formula substitution renders with substituted numbers', () => {
    const mockMetrics = {
      projectId: 'proj-1',
      scorecard: {
        noi: { value: 182400 },
        irr: { value: 16.5 },
        capRate: { value: 7.2 },
        cashFlow: { value: 34200 },
        cashOnCash: { value: 9.8 },
        dscr: { value: 1.23 },
      },
      derived: {
        totalCostBasis: 400000,
        adjustedBasis: 350000,
        totalDebtService: 148200,
        debtYield: 9.2,
        breakEvenOccupancy: 68.0,
        ltc: 75.0,
        maxSupportableLoan: 300000,
        unleveredIrr: 9.5,
        leveredIrr: 16.5,
        balloonBalance: 0,
      },
      insights: {
        financial: {
          ltv: { value: 75 },
          equityMultiple: { value: 1.84 },
          aar: { value: 12.5 },
          capex: { value: 45000 },
        },
        operational: {
          averageRentPerProperty: { value: 3200 },
        },
      },
    } as unknown as ProjectMetricsResult;

    // Test DSCR formula substitution
    const dscrKpi = getKpiById('dscr')!;
    const dscrFormula = dscrKpi.resolveFormulaWithValues(mockMetrics, 'annual');
    expect(dscrFormula).toContain('DSCR =');
    expect(dscrFormula).toContain('$182,400');
    expect(dscrFormula).toContain('$148,200');
    expect(dscrFormula).toContain('1.23×');

    // Test LTC formula substitution
    const ltcKpi = getKpiById('ltc')!;
    const ltcFormula = ltcKpi.resolveFormulaWithValues(mockMetrics, 'annual');
    expect(ltcFormula).toContain('LTC =');
    expect(ltcFormula).toContain('75.0%');
  });

  test('Input provenance correctly flags available vs missing inputs', () => {
    const projectWithUnderwriting = {
      id: 'proj-1',
      propertyName: 'Test Manor',
      purchasePrice: 500000,
      underwriting: {
        acquisition: {
          purchasePrice: 500000,
          buyerClosingCosts: 10000,
          rehabBudget: 25000,
          estimatedARV: 600000,
        },
        rentRoll: {
          grossScheduledRent: 4500,
          otherIncome: 0,
          vacancyRate: 5,
          operatingExpenseRatio: 40,
        },
        debt: {
          loanAmount: 375000,
          targetLTV: 75,
          interestRateType: 'fixed',
          interestRate: 6.5,
          amortizationYears: 30,
          ioPeriodMonths: 0,
        },
        exit: {
          holdPeriodYears: 5,
          exitCapRate: 6.5,
          annualRentGrowth: 3,
          annualExpenseGrowth: 2,
          costOfSale: 5,
        },
        hurdles: {
          minDSCR: 1.25,
          preferredReturn: 8,
          exitCapSensitivityBps: 25,
          rentShockPct: 3,
          vacancyStressRange: [5, 20],
        },
      },
    } as unknown as ProjectSummary;

    const emptyProject = {
      id: 'proj-legacy',
      propertyName: 'Legacy Project',
    } as unknown as ProjectSummary;

    const arvKpi = getKpiById('estimated_arv')!;
    expect(arvKpi.inputs[0].isAvailable(projectWithUnderwriting)).toBe(true);
    expect(arvKpi.inputs[0].isAvailable(emptyProject)).toBe(false);
  });
});
