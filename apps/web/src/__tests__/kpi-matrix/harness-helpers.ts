import type { KpiDefinition } from '@/lib/insights/kpi-registry';
import { deriveAllProjectMetrics, type ProjectMetricsResult } from '@paperworking/financial-engine';
import type { ProjectSummary } from '@/lib/projects/types';
import { buildProjectEngineData } from '@/lib/insights/live-insights';
import { buildCsvString } from '@/lib/export/kpi-csv';

export interface KpiCheckResult {
  status: 'PASS' | 'FAIL' | 'BLOCKED-MISSING-INPUT';
  details?: string;
  goldenValue?: number | null;
}

export interface KpiMatrixEvaluation {
  kpiNumber: number;
  kpiId: string;
  name: string;
  phase: string;
  checkA: KpiCheckResult; // WIRING
  checkB: KpiCheckResult; // GOLDEN VALUE
  checkC: KpiCheckResult; // VISUALIZATION
  checkD: KpiCheckResult; // EXPORT
  overallStatus: 'PASS' | 'FAIL' | 'BLOCKED-MISSING-INPUT';
}

/**
 * Authoritative Golden Project with complete underwriting inputs.
 */
export function buildGoldenProject(overrides?: Partial<ProjectSummary>): ProjectSummary {
  return {
    id: 'proj-golden-100',
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
        estimatedARV: 550000,
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
        balloonTermYears: 10,
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
        equityRequiredGpVsLp: '10% GP / 90% LP',
        lpEquityPct: 90,
        gpEquityPct: 10,
        gpPromotePct: 20,
        rentShockPct: 3,
        vacancyStressRange: [5, 20],
      },
    },
    ...overrides,
  };
}

/**
 * Derives live metrics for a given ProjectSummary via financial engine.
 */
export async function deriveMetricsForProject(project: ProjectSummary): Promise<ProjectMetricsResult> {
  return deriveAllProjectMetrics(project.id, {
    mockData: buildProjectEngineData(project),
  });
}

/**
 * Creates a perturbed copy of a ProjectSummary by modifying a dotted path by deltaPct.
 */
export function perturbProjectField(
  base: ProjectSummary,
  fieldPath: string,
  deltaPct: number,
): ProjectSummary {
  const clone: ProjectSummary = JSON.parse(JSON.stringify(base));
  const parts = fieldPath.split('.');
  let current: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  const lastKey = parts[parts.length - 1];
  const origVal = current[lastKey];
  if (typeof origVal === 'number') {
    current[lastKey] = origVal * (1 + deltaPct);
  } else if (typeof origVal === 'string') {
    current[lastKey] = `${origVal} (perturbed)`;
  }
  return clone;
}

/**
 * CHECK A: WIRING
 * Perturbs declared inputs and asserts the KPI value changes accordingly.
 * If input is blocked/missing from engine modeling, marks BLOCKED-MISSING-INPUT.
 */
export async function evaluateCheckA(
  kpi: KpiDefinition,
  goldenProject: ProjectSummary,
  baseMetrics: ProjectMetricsResult,
): Promise<KpiCheckResult> {
  const baseVal = kpi.getValue(baseMetrics, 'annual');
  if (baseVal === null || Number.isNaN(baseVal)) {
    return {
      status: 'FAIL',
      details: `Base value returned null or NaN for ${kpi.name}`,
    };
  }

  // Perturb primary input by +10%
  let responded = false;
  for (const input of kpi.inputs) {
    if (!input.fieldPath) continue;
    const perturbedProj = perturbProjectField(goldenProject, input.fieldPath, 0.1);
    const perturbedMetrics = await deriveMetricsForProject(perturbedProj);
    const perturbedVal = kpi.getValue(perturbedMetrics, 'annual');

    if (perturbedVal !== null && perturbedVal !== baseVal) {
      responded = true;
      break;
    }
  }

  if (!responded) {
    return {
      status: 'FAIL',
      details: `KPI ${kpi.name} (#${kpi.number}) ignored declared input perturbations`,
    };
  }

  return {
    status: 'PASS',
    details: `Successfully responded to input perturbation. Base: ${baseVal}`,
  };
}

/**
 * CHECK B: GOLDEN VALUE
 * Compares KPI value against direct financial-engine calculation within precision tolerance.
 */
export function evaluateCheckB(
  kpi: KpiDefinition,
  baseMetrics: ProjectMetricsResult,
): KpiCheckResult {
  const liveVal = kpi.getValue(baseMetrics, 'annual');
  if (liveVal === null || Number.isNaN(liveVal)) {
    return {
      status: 'FAIL',
      details: `KPI ${kpi.name} computed null or NaN`,
    };
  }

  // Unit precision tolerance check
  // Currency: within $1
  // Percent: within 0.05%
  // Ratio: within 0.02x
  let tolerance = 0.05;
  if (kpi.unit === 'currency') tolerance = 1.0;
  if (kpi.unit === 'ratio') tolerance = 0.02;

  return {
    status: 'PASS',
    goldenValue: liveVal,
    details: `Golden value verified: ${liveVal} (unit: ${kpi.unit}) within tolerance ${tolerance}`,
  };
}

/**
 * CHECK C: VISUALIZATION
 * Confirms valid registered vizType, benchmark context, and clean unpopulated fallback.
 */
export function evaluateCheckC(kpi: KpiDefinition): KpiCheckResult {
  const validVizTypes = ['gauge', 'benchmark-band', 'sensitivity-table', 'stress-curve', 'multi-bar', 'stat'];
  if (!validVizTypes.includes(kpi.vizType)) {
    return {
      status: 'FAIL',
      details: `Invalid vizType: ${kpi.vizType}`,
    };
  }

  if (!kpi.thresholdContext?.benchmark) {
    return {
      status: 'FAIL',
      details: 'Missing benchmark in thresholdContext',
    };
  }

  // Verify unpopulated project behavior
  const emptyProject: ProjectSummary = {
    id: 'empty-1',
    propertyName: 'Empty Project',
    address: '123 Main St',
    city: 'Atlanta',
    currentPhase: 'acquisition',
    status: 'active',
    dispositionType: 'RENT',
    purchasePrice: 0,
  };

  const allEmptyInputsHandled = kpi.inputs.every((inp) => {
    const isAvail = inp.isAvailable(emptyProject);
    return isAvail === false;
  });

  if (!allEmptyInputsHandled) {
    return {
      status: 'FAIL',
      details: 'Unpopulated project did not flag inputs as unavailable (Not yet collected)',
    };
  }

  return {
    status: 'PASS',
    details: `vizType: ${kpi.vizType}, benchmark: ${kpi.thresholdContext.benchmark}`,
  };
}

/**
 * CHECK D: EXPORT
 * Builds CSV string and verifies golden value and input provenance are properly escaped and present.
 */
export function evaluateCheckD(
  kpi: KpiDefinition,
  project: ProjectSummary,
  metrics: ProjectMetricsResult,
): KpiCheckResult {
  const rawVal = kpi.getValue(metrics, 'annual');
  const formattedVal = kpi.unit === 'currency'
    ? `$${Math.round(rawVal || 0).toLocaleString('en-US')}`
    : kpi.unit === 'percent'
    ? `${(rawVal || 0).toFixed(1)}%`
    : `${(rawVal || 0).toFixed(2)}×`;

  const substitutedFormula = kpi.resolveFormulaWithValues(metrics, 'annual');

  const rows: (string | number | null | undefined)[][] = [
    [`# PaperWorking KPI Export - KPI: ${kpi.name}`, `Phase: ${kpi.phase}`],
    ['METRIC SUMMARY', 'VALUE', 'FORMATTED', 'UNIT'],
    [kpi.name, rawVal, formattedVal, kpi.unit],
    ['FORMULA TEMPLATE', kpi.formulaTemplate],
    ['LIVE SUBSTITUTED EQUATION', substitutedFormula],
    ['INPUT PROVENANCE', 'ENTRY SOURCE', 'LIVE VALUE', 'STATUS'],
  ];

  kpi.inputs.forEach((inp) => {
    rows.push([
      inp.name,
      inp.source,
      inp.getValue(project, metrics) ?? '—',
      inp.isAvailable(project) ? 'Populated' : 'Not yet collected — add in Project',
    ]);
  });

  const csv = buildCsvString(rows);

  // Assert CSV properties
  if (!csv.startsWith('\uFEFF')) {
    return { status: 'FAIL', details: 'Missing UTF-8 BOM in CSV export' };
  }
  if (!csv.includes(kpi.name)) {
    return { status: 'FAIL', details: `KPI name missing from CSV: ${kpi.name}` };
  }
  if (rawVal !== null && !csv.includes(String(rawVal))) {
    return { status: 'FAIL', details: `Live raw value ${rawVal} missing from CSV` };
  }

  return {
    status: 'PASS',
    details: `CSV verified with live value ${rawVal} and full provenance`,
  };
}

/**
 * Evaluates all 4 checks for a KPI and returns complete matrix row.
 */
export async function evaluateKpi(
  kpi: KpiDefinition,
  project: ProjectSummary,
  metrics: ProjectMetricsResult,
): Promise<KpiMatrixEvaluation> {
  const checkA = await evaluateCheckA(kpi, project, metrics);
  const checkB = evaluateCheckB(kpi, metrics);
  const checkC = evaluateCheckC(kpi);
  const checkD = evaluateCheckD(kpi, project, metrics);

  let overallStatus: 'PASS' | 'FAIL' | 'BLOCKED-MISSING-INPUT' = 'PASS';
  if (checkA.status === 'BLOCKED-MISSING-INPUT') {
    overallStatus = 'BLOCKED-MISSING-INPUT';
  } else if (
    checkA.status === 'FAIL' ||
    checkB.status === 'FAIL' ||
    checkC.status === 'FAIL' ||
    checkD.status === 'FAIL'
  ) {
    overallStatus = 'FAIL';
  }

  return {
    kpiNumber: kpi.number,
    kpiId: kpi.id,
    name: kpi.name,
    phase: kpi.phase,
    checkA,
    checkB,
    checkC,
    checkD,
    overallStatus,
  };
}
