import type { Project, PropertyMetricSnapshot } from '@/types/schema';
import { 
  deriveAllMetrics, 
  computeNOIComponents, 
  computeTotalCashInvested, 
  computeAnnualDebtService, 
  computeNOI, 
  computeCashFlow,
  computeCapRate,
  computeCoCReturn,
  computeOER,
  computeGRM
} from '@/lib/metrics/reiMetrics';
import { parseDate } from '@/lib/metrics/helpers';

export type InsightSeverity = 'good' | 'info' | 'warning' | 'risk';
export type InsightKind = 'benchmark' | 'drift' | 'trend' | 'standout' | 'locked';

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  scope: 'portfolio' | 'project';
  projectId?: string;
  projectName?: string;
  metric: string; // e.g. 'CAP_RATE', 'DSCR', 'COC', 'OCCUPANCY', 'OER', 'APPRECIATION', 'NOI', 'CASH_FLOW', 'GRM', 'IRR'
  headline: string;
  detail: string;
  value: number | string;
  benchmark: string;
  recommendedAction?: string;
}

export interface MetricThresholds {
  min?: number;
  max?: number;
  goodMin?: number;
  goodMax?: number;
  warningMin?: number;
  warningMax?: number;
}

export const BENCHMARKS: Record<string, MetricThresholds> = {
  CAP_RATE: { goodMin: 4, goodMax: 10, warningMin: 0 },
  DSCR: { goodMin: 1.25, warningMin: 1.0 },
  COC: { goodMin: 8, goodMax: 12 },
  OCCUPANCY: { goodMin: 90, warningMin: 80 },
  OER: { goodMax: 40, warningMax: 55 },
  APPRECIATION: { goodMin: 3, goodMax: 5, warningMin: 0 },
  PRICE_TO_RENT: { goodMax: 15, warningMax: 20 },
};

// Phase mapping for the 10 core metrics
export const METRIC_PHASE_REQUIREMENTS: Record<string, { phase: number; name: string }> = {
  CAP_RATE: { phase: 1, name: 'Acquisition' },
  GRM: { phase: 1, name: 'Acquisition' },
  APPRECIATION: { phase: 1, name: 'Acquisition' },
  PRICE_TO_RENT: { phase: 1, name: 'Acquisition' },
  DSCR: { phase: 2, name: 'Fund' },
  COC: { phase: 2, name: 'Fund' },
  NOI: { phase: 3, name: 'Hold' },
  CASH_FLOW: { phase: 3, name: 'Hold' },
  OCCUPANCY: { phase: 3, name: 'Hold' },
  OER: { phase: 3, name: 'Hold' },
  IRR: { phase: 4, name: 'Exit' },
};

/**
 * Derives pro-forma underwriting metrics for a project by forcing Phase 1 rules 
 * (which bypasses actual/live tenancy/rental receipts and uses underwriting targets).
 */
export function deriveProFormaMetrics(project: Project) {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
  const arv = financials.estimatedARV ?? financials.estimatedCurrentValue ?? purchasePrice;
  return deriveAllMetrics(financials, arv, project.dispositionType, 1, project.createdAt);
}

/**
 * Derives current actual/live metrics for a project using its active phase.
 */
export function deriveActualMetrics(project: Project) {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
  const value = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;
  return deriveAllMetrics(financials, value, project.dispositionType, project.currentPhase ?? 1, project.createdAt);
}

/**
 * Evaluates the deterministic Insight Engine rules.
 */
export function evaluateInsights(
  projects: Project[],
  snapshots: PropertyMetricSnapshot[],
  options?: { tolerance?: number }
): Insight[] {
  const insights: Insight[] = [];
  const tolerance = options?.tolerance ?? 0.10; // Default ±10%

  // Group snapshots by project
  const snapshotsByProject: Record<string, PropertyMetricSnapshot[]> = {};
  for (const snap of snapshots) {
    if (!snapshotsByProject[snap.projectId]) {
      snapshotsByProject[snap.projectId] = [];
    }
    snapshotsByProject[snap.projectId].push(snap);
  }

  // Sort project snapshots chronologically
  for (const pid in snapshotsByProject) {
    snapshotsByProject[pid].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Evaluate Project-level rules
  for (const project of projects) {
    const currentPhase = project.currentPhase ?? 1;

    // ── RULE 1: Phase Lock Guardrails ──
    // If a project's current phase is less than the metric's required phase, emit a 'locked' insight.
    const lockedMetrics: string[] = [];
    for (const [metricId, req] of Object.entries(METRIC_PHASE_REQUIREMENTS)) {
      if (currentPhase < req.phase) {
        lockedMetrics.push(metricId);
        insights.push({
          id: `${project.id}_${metricId}_locked`,
          kind: 'locked',
          severity: 'info',
          scope: 'project',
          projectId: project.id,
          projectName: project.propertyName,
          metric: metricId,
          headline: `${metricId.replace('_', ' ')} Locked`,
          detail: `This metric unlocks in the ${req.name} phase. Current phase is ${getPhaseName(currentPhase)}.`,
          value: '🔒 Locked',
          benchmark: `Requires Phase ${req.phase} (${req.name})`,
        });
      }
    }

    // Skip evaluations of other rules for locked metrics
    const isLocked = (m: string) => lockedMetrics.includes(m);

    // Compute actuals and pro-forma for active metrics
    const actuals = deriveActualMetrics(project);
    const proForma = deriveProFormaMetrics(project);

    // Map metric keys from DerivedMetrics to MetricId strings
    const actualValues: Record<string, number | null> = {
      CAP_RATE: actuals.capRate,
      GRM: actuals.grossRentMultiplier,
      APPRECIATION: actuals.annualizedAppreciation,
      DSCR: actuals.dscr === 999 ? 999 : actuals.dscr, // handle all-cash DSCR
      COC: actuals.cashOnCashReturn,
      NOI: actuals.noi,
      CASH_FLOW: actuals.annualCashFlow,
      OCCUPANCY: actuals.occupancyRate,
      OER: actuals.oer,
      IRR: actuals.irr,
    };

    const proFormaValues: Record<string, number | null> = {
      CAP_RATE: proForma.capRate,
      GRM: proForma.grossRentMultiplier,
      APPRECIATION: proForma.annualizedAppreciation,
      DSCR: proForma.dscr,
      COC: proForma.cashOnCashReturn,
      NOI: proForma.noi,
      CASH_FLOW: proForma.annualCashFlow,
      OCCUPANCY: proForma.occupancyRate,
      OER: proForma.oer,
      IRR: proForma.irr,
    };

    // ── RULE 2: Benchmark Breaches ──
    for (const [metricId, value] of Object.entries(actualValues)) {
      if (isLocked(metricId) || value === null) continue;

      const thresholds = BENCHMARKS[metricId];
      if (!thresholds) continue;

      // DSCR special all-cash override
      if (metricId === 'DSCR' && value === 999) continue;

      let severity: InsightSeverity = 'good';
      let detail = '';
      let headline = '';
      let action = '';

      if (metricId === 'CAP_RATE') {
        const val = value as number;
        if (val < 0 || val > 12) {
          severity = 'risk';
          headline = 'Cap Rate Outlier';
          detail = `${project.propertyName} Cap Rate is ${val.toFixed(2)}%, which is outside typical healthy bands.`;
          action = 'Review operating expenses or verify ARV calculations.';
        } else if (val < 4.0) {
          severity = 'warning';
          headline = 'Sub-Optimal Cap Rate';
          detail = `${project.propertyName} Cap Rate is ${val.toFixed(2)}%, which is below the 4% target for SFRs.`;
          action = 'Identify opportunities to increase rental yields or decrease opex.';
        } else {
          severity = 'good';
          headline = 'Strong Capitalization Rate';
          detail = `${project.propertyName} Cap Rate is ${val.toFixed(2)}%, meeting baseline investment criteria.`;
        }
      }

      else if (metricId === 'DSCR') {
        const val = value as number;
        if (val < 1.0) {
          severity = 'risk';
          headline = 'Critical Debt Coverage';
          detail = `${project.propertyName} DSCR is ${val.toFixed(2)}x, indicating operational cash flow is insufficient to cover debt service.`;
          action = 'Refinance to lower rates, inject equity, or reduce management opex immediately.';
        } else if (val < 1.25) {
          severity = 'warning';
          headline = 'Tight Debt Coverage';
          detail = `${project.propertyName} DSCR is ${val.toFixed(2)}x, which is below the standard underwriting benchmark of 1.25x.`;
          action = 'Monitor occupancy trends closely to maintain a safety cushion.';
        } else {
          severity = 'good';
          headline = 'Solid Debt Service Coverage';
          detail = `${project.propertyName} DSCR is ${val.toFixed(2)}x, fully satisfying B2B underwriting benchmarks.`;
        }
      }

      else if (metricId === 'COC') {
        const val = value as number;
        if (val < 0) {
          severity = 'risk';
          headline = 'Negative Cash Yield';
          detail = `${project.propertyName} Cash-on-Cash Return is negative (${val.toFixed(2)}%). You are losing money on cash invested.`;
          action = 'Assess lease-up velocity or restructure partner equity allocations.';
        } else if (val < 8.0) {
          severity = 'warning';
          headline = 'Below-Target Cash Yield';
          detail = `${project.propertyName} Cash-on-Cash Return is ${val.toFixed(2)}%, failing to meet the 8-12% investor hurdle.`;
          action = 'Optimize ancillary income channels (laundry, parking, storage).';
        } else if (val >= 8.0 && val <= 12.0) {
          severity = 'good';
          headline = 'Optimal Cash-on-Cash Yield';
          detail = `${project.propertyName} Cash-on-Cash Return is ${val.toFixed(2)}%, perfectly hitting target bands.`;
        } else {
          severity = 'good';
          headline = 'Exceptional Cash-on-Cash Return';
          detail = `${project.propertyName} Cash-on-Cash Return is ${val.toFixed(2)}%, beating target investment parameters.`;
        }
      }

      else if (metricId === 'OCCUPANCY') {
        const val = value as number;
        if (val < 80.0) {
          severity = 'risk';
          headline = 'High Vacancy Threat';
          detail = `${project.propertyName} Occupancy is at ${val.toFixed(1)}% (Vacancy is ${(100-val).toFixed(1)}%), representing high operational risk.`;
          action = 'Execute marketing campaign, offer lease concessions, or review tenant screening timeframes.';
        } else if (val < 90.0) {
          severity = 'warning';
          headline = 'Elevated Vacancy Rate';
          detail = `${project.propertyName} Occupancy is at ${val.toFixed(1)}%, failing to meet the 90% optimal occupancy rate.`;
          action = 'Check local market rent comparables to ensure competitive pricing.';
        } else {
          severity = 'good';
          headline = 'Optimal Portfolio Occupancy';
          detail = `${project.propertyName} Occupancy is at ${val.toFixed(1)}%, signaling a stable rent roll.`;
        }
      }

      else if (metricId === 'OER') {
        const val = value as number;
        if (val > 55.0) {
          severity = 'risk';
          headline = 'Excessive Operating Expenses';
          detail = `${project.propertyName} Expense Ratio (OER) is ${val.toFixed(1)}%, indicating high capital leakage.`;
          action = 'Perform line-by-line audit of utility meters, tax assessments, and insurance packages.';
        } else if (val > 40.0) {
          severity = 'warning';
          headline = 'Elevated Expense Ratio';
          detail = `${project.propertyName} Expense Ratio (OER) is ${val.toFixed(1)}%, slightly above the 40% optimal threshold.`;
          action = 'Renegotiate property management contract or implement tenant-utility billing (RUBS).';
        } else {
          severity = 'good';
          headline = 'Highly Efficient Operations';
          detail = `${project.propertyName} Expense Ratio (OER) is ${val.toFixed(1)}%, keeping overhead very lean.`;
        }
      }

      else if (metricId === 'APPRECIATION') {
        const val = value as number;
        if (val < 0) {
          severity = 'risk';
          headline = 'Negative Appreciation';
          detail = `${project.propertyName} Appraised Value is deteriorating at an annualized rate of ${val.toFixed(2)}%.`;
          action = 'Assess rehabilitation quality or order localized broker price opinion (BPO).';
        } else if (val < 3.0) {
          severity = 'warning';
          headline = 'Sluggish Value Growth';
          detail = `${project.propertyName} Appreciation is ${val.toFixed(2)}%, lagging the 3-5% baseline real estate average.`;
          action = 'Add value through forced rehab appreciation or local rezoning strategies.';
        } else {
          severity = 'good';
          headline = 'Healthy Property Appreciation';
          detail = `${project.propertyName} Value growth is expanding at ${val.toFixed(2)}% annually.`;
        }
      }

      // Add the insight
      const formatBenchmarkRange = (m: string) => {
        if (m === 'DSCR') return '>= 1.25x';
        if (m === 'OER') return '<= 40.0%';
        if (m === 'OCCUPANCY') return '>= 90.0%';
        if (m === 'CAP_RATE') return '4.0% - 10.0%';
        if (m === 'COC') return '8.0% - 12.0%';
        if (m === 'APPRECIATION') return '3.0% - 5.0%';
        return '';
      };

      insights.push({
        id: `${project.id}_${metricId}_benchmark`,
        kind: 'benchmark',
        severity,
        scope: 'project',
        projectId: project.id,
        projectName: project.propertyName,
        metric: metricId,
        headline,
        detail,
        value: typeof value === 'number' ? (metricId === 'DSCR' ? `${value.toFixed(2)}x` : `${value.toFixed(2)}%`) : value,
        benchmark: formatBenchmarkRange(metricId),
        recommendedAction: action || undefined,
      });
    }

    // ── RULE 3: Thesis Drift ──
    // Compare actual metrics against pro-forma benchmarks if the project is in Hold (Phase 3) or Exit (Phase 4).
    if (currentPhase >= 3) {
      const driftMetrics = ['NOI', 'CASH_FLOW', 'CAP_RATE', 'COC', 'OER'];
      for (const metricId of driftMetrics) {
        if (isLocked(metricId)) continue;

        const actualVal = actualValues[metricId];
        const proFormaVal = proFormaValues[metricId];

        if (actualVal === null || proFormaVal === null || proFormaVal === 0) continue;

        const pctDiff = (actualVal - proFormaVal) / proFormaVal;

        // OER (operating expense ratio) is a cost-centric metric: higher is worse.
        // For other metrics (NOI, Cash Flow, Cap Rate, CoC), lower is worse.
        const isCostMetric = metricId === 'OER';
        const isDeteriorating = isCostMetric ? pctDiff > tolerance : pctDiff < -tolerance;
        const isOutperforming = isCostMetric ? pctDiff < -tolerance : pctDiff > tolerance;

        if (isDeteriorating) {
          const isCritical = Math.abs(pctDiff) > tolerance * 2;
          insights.push({
            id: `${project.id}_${metricId}_drift_bad`,
            kind: 'drift',
            severity: isCritical ? 'risk' : 'warning',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: metricId,
            headline: `${metricId.replace('_', ' ')} Underperforming Thesis`,
            detail: `${project.propertyName} actual ${metricId.replace('_', ' ')} is ${formatVal(actualVal, metricId)} vs pro-forma expected ${formatVal(proFormaVal, metricId)} (a deviation of ${(pctDiff * 100).toFixed(1)}%).`,
            value: formatVal(actualVal, metricId),
            benchmark: `Pro-Forma: ${formatVal(proFormaVal, metricId)}`,
            recommendedAction: `Perform operational audit. Review underlying assumptions for ${metricId.replace('_', ' ')} inside pro forma.`,
          });
        } else if (isOutperforming) {
          insights.push({
            id: `${project.id}_${metricId}_drift_good`,
            kind: 'drift',
            severity: 'good',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: metricId,
            headline: `${metricId.replace('_', ' ')} Beating Thesis`,
            detail: `${project.propertyName} actual ${metricId.replace('_', ' ')} is outperforming pro-forma projections by ${Math.abs(pctDiff * 100).toFixed(1)}% (${formatVal(actualVal, metricId)} actual vs ${formatVal(proFormaVal, metricId)} pro-forma).`,
            value: formatVal(actualVal, metricId),
            benchmark: `Pro-Forma: ${formatVal(proFormaVal, metricId)}`,
          });
        }
      }

      // Rehab cost drift rule (projectedRehabCost vs rehabBudget or rehabActual)
      const rehabBudget = project.financials.projectedRehabCost ?? 0;
      // Get actual rehab spent: totalRehabActual or sum of approved costs
      const actualRehab = project.financials.rehabActual ?? project.financials.actualRehabCost ?? 0;

      if (rehabBudget > 0 && actualRehab > 0) {
        const rehabDiff = (actualRehab - rehabBudget) / rehabBudget;
        if (rehabDiff > tolerance) {
          const isCritical = rehabDiff > tolerance * 2;
          insights.push({
            id: `${project.id}_REHAB_COST_drift`,
            kind: 'drift',
            severity: isCritical ? 'risk' : 'warning',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: 'REHAB_COST',
            headline: 'Rehab Budget Overrun',
            detail: `${project.propertyName} rehab costs exceed budget by ${(rehabDiff * 100).toFixed(1)}% ($${Math.round(actualRehab).toLocaleString()} actual vs $${Math.round(rehabBudget).toLocaleString()} budget).`,
            value: `$${Math.round(actualRehab).toLocaleString()}`,
            benchmark: `Budget: $${Math.round(rehabBudget).toLocaleString()}`,
            recommendedAction: 'Freeze non-essential work, review contractor change orders, and update reserve allocations.',
          });
        }
      }
    }

    // ── RULE 4: Trend Analysis ──
    // Look at time-series snapshots (last N periods) to see if a metric is deteriorating or improving.
    const projSnaps = snapshotsByProject[project.id] || [];
    if (projSnaps.length >= 3) {
      // Analyze last 3 snapshots
      const last3 = projSnaps.slice(-3);
      
      // Occupancy Rate Trend
      const occs = last3.map(s => s.occupancyRate).filter((v): v is number => v !== null);
      if (occs.length === 3) {
        const [o1, o2, o3] = occs;
        if (o3 < o2 && o2 < o1) {
          insights.push({
            id: `${project.id}_OCCUPANCY_trend_down`,
            kind: 'trend',
            severity: 'warning',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: 'OCCUPANCY',
            headline: 'Occupancy Deteriorating',
            detail: `Occupancy has declined consecutively over the last 3 periods (${o1.toFixed(1)}% → ${o2.toFixed(1)}% → ${o3.toFixed(1)}%).`,
            value: `${o3.toFixed(1)}%`,
            benchmark: 'Steady or Rising',
            recommendedAction: 'Analyze lease turnover reasons and evaluate tenant satisfaction scores.',
          });
        } else if (o3 > o2 && o2 > o1) {
          insights.push({
            id: `${project.id}_OCCUPANCY_trend_up`,
            kind: 'trend',
            severity: 'good',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: 'OCCUPANCY',
            headline: 'Occupancy Improving',
            detail: `Occupancy has risen consecutively over the last 3 periods (${o1.toFixed(1)}% → ${o2.toFixed(1)}% → ${o3.toFixed(1)}%).`,
            value: `${o3.toFixed(1)}%`,
            benchmark: 'Steady or Rising',
          });
        }
      }

      // Cash Flow Trend
      const cfs = last3.map(s => s.annualCashFlow).filter((v): v is number => v !== null);
      if (cfs.length === 3) {
        const [c1, c2, c3] = cfs;
        if (c3 < c2 && c2 < c1) {
          const turnedNegative = c3 < 0;
          insights.push({
            id: `${project.id}_CASH_FLOW_trend_down`,
            kind: 'trend',
            severity: turnedNegative ? 'risk' : 'warning',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: 'CASH_FLOW',
            headline: turnedNegative ? 'Cash Flow Turned Negative' : 'Cash Flow Declining',
            detail: `Cash flow has decreased consecutively over the last 3 periods ($${Math.round(c1).toLocaleString()} → $${Math.round(c2).toLocaleString()} → $${Math.round(c3).toLocaleString()}).`,
            value: `$${Math.round(c3).toLocaleString()}`,
            benchmark: 'Positive Cash Flow',
            recommendedAction: 'Audit rental collection lags or review utility billing leaks.',
          });
        }
      }

      // Expense Ratio (OER) Trend
      const oers = last3.map(s => s.oer).filter((v): v is number => v !== null);
      if (oers.length === 3) {
        const [oe1, oe2, oe3] = oers;
        if (oe3 > oe2 && oe2 > oe1) {
          insights.push({
            id: `${project.id}_OER_trend_up`,
            kind: 'trend',
            severity: 'warning',
            scope: 'project',
            projectId: project.id,
            projectName: project.propertyName,
            metric: 'OER',
            headline: 'Expenses Rising',
            detail: `Operating Expense Ratio has risen consecutively over the last 3 periods (${oe1.toFixed(1)}% → ${oe2.toFixed(1)}% → ${oe3.toFixed(1)}%).`,
            value: `${oe3.toFixed(1)}%`,
            benchmark: 'Steady OER',
            recommendedAction: 'Investigate repair costs or contract out property maintenance lines.',
          });
        }
      }
    }
  }

  // ── RULE 5: Standout Portfolio-level Insights ──
  if (projects.length > 0) {
    const validProjects = projects.filter(p => (p.currentPhase ?? 1) >= 1);
    
    // Sort projects by actual Cap Rate (highest)
    const capRateRanks = [...validProjects]
      .map(p => ({ project: p, metrics: deriveActualMetrics(p) }))
      .filter(x => x.metrics.capRate > 0)
      .sort((a, b) => b.metrics.capRate - a.metrics.capRate);

    if (capRateRanks.length > 0) {
      const topCap = capRateRanks[0];
      insights.push({
        id: 'portfolio_highest_cap_rate',
        kind: 'standout',
        severity: 'good',
        scope: 'portfolio',
        metric: 'CAP_RATE',
        headline: 'Portfolio Cap Rate Leader',
        detail: `${topCap.project.propertyName} is leading the portfolio with a Cap Rate of ${topCap.metrics.capRate.toFixed(2)}%.`,
        value: `${topCap.metrics.capRate.toFixed(2)}%`,
        benchmark: 'Portfolio Leader',
      });
    }

    // Sort projects by Cash-on-Cash Return
    const cocRanks = [...validProjects]
      .map(p => ({ project: p, metrics: deriveActualMetrics(p) }))
      .filter(x => x.project.currentPhase !== undefined && x.project.currentPhase >= 2 && x.metrics.cashOnCashReturn !== null)
      .sort((a, b) => b.metrics.cashOnCashReturn - a.metrics.cashOnCashReturn);

    if (cocRanks.length > 0) {
      const topCoc = cocRanks[0];
      insights.push({
        id: 'portfolio_highest_coc',
        kind: 'standout',
        severity: 'good',
        scope: 'portfolio',
        metric: 'COC',
        headline: 'Portfolio Yield Leader',
        detail: `${topCoc.project.propertyName} is yielding the highest Cash-on-Cash Return at ${topCoc.metrics.cashOnCashReturn.toFixed(2)}%.`,
        value: `${topCoc.metrics.cashOnCashReturn.toFixed(2)}%`,
        benchmark: 'Portfolio Leader',
      });

      // Bottom performer check (dragging portfolio)
      if (cocRanks.length > 1) {
        const bottomCoc = cocRanks[cocRanks.length - 1];
        if (bottomCoc.metrics.cashOnCashReturn < 4.0) {
          insights.push({
            id: 'portfolio_lowest_coc_drag',
            kind: 'standout',
            severity: 'risk',
            scope: 'portfolio',
            metric: 'COC',
            headline: 'Portfolio Yield Drag',
            detail: `${bottomCoc.project.propertyName} has the lowest Cash-on-Cash Return at ${bottomCoc.metrics.cashOnCashReturn.toFixed(2)}%, lagging the portfolio average.`,
            value: `${bottomCoc.metrics.cashOnCashReturn.toFixed(2)}%`,
            benchmark: 'Portfolio Drag',
            recommendedAction: 'Re-evaluate leverage structure or opex allocations on this deal.',
          });
        }
      }
    }
  }

  return insights;
}

// Helper to format values nicely
function formatVal(val: number, metric: string): string {
  if (metric === 'NOI' || metric === 'CASH_FLOW') {
    return `$${Math.round(val).toLocaleString()}`;
  }
  if (metric === 'OER' || metric === 'COC' || metric === 'CAP_RATE' || metric === 'APPRECIATION' || metric === 'OCCUPANCY') {
    return `${val.toFixed(2)}%`;
  }
  if (metric === 'DSCR') {
    return `${val.toFixed(2)}x`;
  }
  return val.toFixed(2);
}

// Helper to translate phase number to label
function getPhaseName(phaseNum: number): string {
  switch (phaseNum) {
    case 1: return 'Acquisition';
    case 2: return 'Fund';
    case 3: return 'Hold';
    case 4: return 'Exit';
    default: return `Phase ${phaseNum}`;
  }
}
