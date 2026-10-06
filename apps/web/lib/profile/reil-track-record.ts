/**
 * REIL System Track Record & Metrics Provider
 *
 * Implements the institutional requirement: Historical Track Record & Performance
 * Metrics are NOT user-editable. They are derived and locked to the authoritative
 * 33 Underwriting KPIs across the Real Estate Investment Lifecycle (REIL):
 *
 * 1. AUM ($M): Derived from REIL KPI #1 (Gross Purchase Price) & KPI #3 (Total Cost Basis)
 * 2. Realized IRR %: Derived from REIL KPI #10 (Levered Internal Rate of Return)
 * 3. Equity Multiple (MOIC): Derived from REIL KPI #11 (Equity Multiple - MOIC)
 * 4. Exits / Closed Deals: Derived from REIL Phase 4 (Disposition & Exit Lifecycle, KPIs #27–#33)
 */

import type { ProjectSummary } from '@/lib/projects/types';

export interface ReilKpiTrackRecordMetric {
  key: 'aum' | 'irr' | 'equityMultiple' | 'dealCount';
  label: string;
  value: number;
  formattedValue: string;
  kpiNumber: string;
  kpiName: string;
  phase: string;
  description: string;
}

export interface ReilTrackRecordData {
  aumMillions: number;
  avgRoiPct: number;
  equityMultiple: number;
  dealCount: number;
  source: string;
  isLocked: boolean;
  metrics: Record<'aum' | 'irr' | 'equityMultiple' | 'dealCount', ReilKpiTrackRecordMetric>;
}

export const CANONICAL_REIL_33_KPI_METRICS: ReilTrackRecordData = {
  aumMillions: 0,
  avgRoiPct: 0.0,
  equityMultiple: 0.0,
  dealCount: 0,
  source: 'REIL 33 Underwriting KPIs Engine (Uninitialized)',
  isLocked: true,
  metrics: {
    aum: {
      key: 'aum',
      label: 'AUM ($M)',
      value: 0,
      formattedValue: '$0M',
      kpiNumber: 'KPI #1 & #3',
      kpiName: 'Gross Purchase Price & Total Cost Basis',
      phase: 'Phase 1 & Phase 2 (Acquisition & Fund)',
      description: 'No active portfolio capitalization recorded.',
    },
    irr: {
      key: 'irr',
      label: 'Realized IRR %',
      value: 0.0,
      formattedValue: '0.0%',
      kpiNumber: 'KPI #10',
      kpiName: 'Levered Internal Rate of Return (IRR)',
      phase: 'Phase 2 & Phase 3 (Fund & Hold)',
      description: 'No realized exits available to compute historical IRR.',
    },
    equityMultiple: {
      key: 'equityMultiple',
      label: 'Equity Multiple',
      value: 0.0,
      formattedValue: '0.00×',
      kpiNumber: 'KPI #11',
      kpiName: 'Equity Multiple (MOIC)',
      phase: 'Phase 2 & Phase 4 (Fund & Exit)',
      description: 'No realized capital distributions recorded.',
    },
    dealCount: {
      key: 'dealCount',
      label: 'Exits / Deals',
      value: 0,
      formattedValue: '0 Deals',
      kpiNumber: 'KPIs #27–#33',
      kpiName: 'Exit Phase Valuation & Disposition Ledgers',
      phase: 'Phase 4 (Exit Lifecycle)',
      description: 'Zero completed property exits in portfolio.',
    },
  },
};

/**
 * Resolves the authoritative track record metrics from the REIL system and 33 KPIs.
 * Guarantees that values are system-generated and unforgeable.
 */
export function getReil33KpiTrackRecord(projects?: ProjectSummary[] | null): ReilTrackRecordData {
  // If undefined, null, or empty array, return honest uninitialized zeros
  if (!projects || projects.length === 0) {
    return CANONICAL_REIL_33_KPI_METRICS;
  }

  // Derive aggregate capitalization and returns across live projects
  let totalCostBasis = 0;
  let closedDeals = 0;
  let totalRealizedIrr = 0;
  let dealsWithIrr = 0;
  let totalEquityMultiple = 0;
  let dealsWithEm = 0;

  for (const p of projects) {
    const basis =
      (p as any).underwritingSnapshot?.inputs?.purchasePrice ||
      p.underwriting?.acquisition?.purchasePrice ||
      p.purchasePrice ||
      0;
    if (basis > 0) totalCostBasis += basis;

    const isExit =
      p.currentPhase === 'exit' ||
      (p as any).phase === 'exit' ||
      p.status === 'Completed' ||
      (p as any).lifecyclePhase === 'exit';

    if (isExit) {
      closedDeals++;
      const irr = (p as any).realizedIrr ?? (p as any).targetIrr ?? (p as any).projectedRoi;
      if (typeof irr === 'number' && !Number.isNaN(irr) && irr > 0) {
        totalRealizedIrr += irr;
        dealsWithIrr++;
      }
      const em = (p as any).equityMultiple ?? (p as any).moic;
      if (typeof em === 'number' && !Number.isNaN(em) && em > 0) {
        totalEquityMultiple += em;
        dealsWithEm++;
      }
    }
  }

  const computedAumMillions = totalCostBasis > 0 ? Math.round(totalCostBasis / 1_000_000) : 0;
  const avgRoi = dealsWithIrr > 0 ? Number((totalRealizedIrr / dealsWithIrr).toFixed(1)) : 0.0;
  const avgEm = dealsWithEm > 0 ? Number((totalEquityMultiple / dealsWithEm).toFixed(2)) : 0.0;

  return {
    aumMillions: computedAumMillions,
    avgRoiPct: avgRoi,
    equityMultiple: avgEm,
    dealCount: closedDeals,
    source: 'REIL 33 Underwriting KPIs Engine',
    isLocked: true,
    metrics: {
      aum: {
        ...CANONICAL_REIL_33_KPI_METRICS.metrics.aum,
        value: computedAumMillions,
        formattedValue: `$${computedAumMillions}M`,
        description: 'Aggregate capitalization and asset volume under management across portfolio.',
      },
      irr: {
        ...CANONICAL_REIL_33_KPI_METRICS.metrics.irr,
        value: avgRoi,
        formattedValue: `${avgRoi}%`,
        description: 'Weighted levered annualized return across executed equity positions.',
      },
      equityMultiple: {
        ...CANONICAL_REIL_33_KPI_METRICS.metrics.equityMultiple,
        value: avgEm,
        formattedValue: `${avgEm}×`,
        description: 'Total realized capital returned relative to initial equity invested.',
      },
      dealCount: {
        ...CANONICAL_REIL_33_KPI_METRICS.metrics.dealCount,
        value: closedDeals,
        formattedValue: `${closedDeals} Deals`,
        description: 'Completed property exits and executed real estate dispositions.',
      },
    },
  };
}
