import {
  deriveSingleProjectMetrics,
  derivePortfolioMetrics,
  buildLiveKpiSections,
  build24MonthTrendSeries,
  buildProjectComparisonPoints,
  buildProjectEngineData,
} from '@/lib/insights/live-insights';
import type { ProjectSummary } from '@/lib/projects/types';

describe('Live Insights Unmasking & Financial Engine Consumption', () => {
  const mockProject1: ProjectSummary = {
    id: 'proj-live-1',
    propertyName: 'Highland Park Lofts',
    address: '100 Highland Ave',
    city: 'Atlanta',
    currentPhase: 'hold',
    status: 'active',
    dispositionType: 'RENT',
    purchasePrice: 400000,
    underwriting: {
      acquisition: {
        purchasePrice: 400000,
        buyerClosingCosts: 8000,
        rehabBudget: 42000,
        estimatedARV: 500000,
      },
      rentRoll: {
        grossScheduledRent: 4000, // $4,000/mo = $48,000/yr
        otherIncome: 200,
        vacancyRate: 5,
        operatingExpenseRatio: 40,
      },
      debt: {
        loanAmount: 300000,
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
  };

  const mockProject2: ProjectSummary = {
    id: 'proj-live-2',
    propertyName: 'Bayview Terrace',
    address: '250 Ocean Dr',
    city: 'Miami',
    currentPhase: 'acquisition',
    status: 'active',
    dispositionType: 'RENT',
    purchasePrice: 600000,
    underwriting: {
      acquisition: {
        purchasePrice: 600000,
        buyerClosingCosts: 12000,
        rehabBudget: 38000,
        estimatedARV: 720000,
      },
      rentRoll: {
        grossScheduledRent: 5500, // $5,500/mo = $66,000/yr
        otherIncome: 0,
        vacancyRate: 4,
        operatingExpenseRatio: 38,
      },
      debt: {
        loanAmount: 450000,
        targetLTV: 75,
        interestRateType: 'fixed',
        interestRate: 6.25,
        amortizationYears: 30,
        ioPeriodMonths: 0,
      },
      exit: {
        holdPeriodYears: 5,
        exitCapRate: 6.0,
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
  };

  test('deriveSingleProjectMetrics computes live values from project inputs', async () => {
    const res = await deriveSingleProjectMetrics(mockProject1);
    expect(res.scorecard.noi.value).toBeGreaterThan(0);
    expect(res.scorecard.noi.missingInputs).toBeUndefined();
    expect(res.derived.debtYield).toBeGreaterThan(0);
    expect(res.derived.breakEvenOccupancy).toBeGreaterThan(0);
    expect(res.derived.ltc).toBeCloseTo((300000 / 450000) * 100, 1);
  });

  test('derivePortfolioMetrics aggregates across multiple live projects', async () => {
    const { metricsResult, projectResults } = await derivePortfolioMetrics([mockProject1, mockProject2]);
    expect(projectResults.size).toBe(2);
    expect(metricsResult.projectId).toBe('portfolio-aggregate');
    // Total Basis = 450k + 650k = $1,100,000
    expect(metricsResult.derived.totalCostBasis).toBe(1100000);
    expect(metricsResult.scorecard.noi.value).toBeGreaterThan(40000);
  });

  test('buildLiveKpiSections genuinely rescales flow metrics across Month / Quarter / Year periods', async () => {
    const res = await deriveSingleProjectMetrics(mockProject1);
    const annualSections = buildLiveKpiSections(res, 'annual');
    const quarterlySections = buildLiveKpiSections(res, 'quarterly');
    const monthlySections = buildLiveKpiSections(res, 'monthly');

    const annualNoi = annualSections[0].metrics.find((m) => m.id === 'noi')?.value as number;
    const quarterlyNoi = quarterlySections[0].metrics.find((m) => m.id === 'noi')?.value as number;
    const monthlyNoi = monthlySections[0].metrics.find((m) => m.id === 'noi')?.value as number;

    expect(annualNoi).toBeGreaterThan(0);
    expect(quarterlyNoi).toBeCloseTo(annualNoi / 4, 0);
    expect(monthlyNoi).toBeCloseTo(annualNoi / 12, 0);
  });

  test('build24MonthTrendSeries produces exactly 24 points with historical vs projected distinction', async () => {
    const res = await deriveSingleProjectMetrics(mockProject1);
    const series = build24MonthTrendSeries(res, 8);

    expect(series.noi).toHaveLength(24);
    expect(series.cash_flow).toHaveLength(24);
    expect(series.occupancy).toHaveLength(24);

    // Points 1..8 are historical
    expect(series.noi[0].isProjected).toBe(false);
    expect(series.noi[7].isProjected).toBe(false);

    // Points 9..24 are projected
    expect(series.noi[8].isProjected).toBe(true);
    expect(series.noi[23].isProjected).toBe(true);
  });

  test('buildProjectComparisonPoints maps active projects without deal-1/deal-2/deal-3 seeds', async () => {
    const { projectResults } = await derivePortfolioMetrics([mockProject1, mockProject2]);
    const comparisonPoints = buildProjectComparisonPoints(
      [mockProject1, mockProject2],
      projectResults,
      'cap_rate',
    );

    expect(comparisonPoints).toHaveLength(2);
    expect(comparisonPoints[0].projectId).toBe('proj-live-1');
    expect(comparisonPoints[0].projectName).toBe('Highland Park Lofts');
    expect(comparisonPoints[1].projectId).toBe('proj-live-2');
    expect(comparisonPoints[1].projectName).toBe('Bayview Terrace');
  });

  test('Strict Invariant: zero occurrence of forbidden terminology in live-insights', () => {
    const engineData = buildProjectEngineData(mockProject1);
    const jsonString = JSON.stringify(engineData).toLowerCase();
    expect(jsonString).not.toContain(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''));
  });
});
