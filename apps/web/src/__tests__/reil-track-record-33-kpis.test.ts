import { describe, expect, it } from '@jest/globals';
import {
  CANONICAL_REIL_33_KPI_METRICS,
  getReil33KpiTrackRecord,
} from '@/lib/profile/reil-track-record';
import { AUTHORITATIVE_33_KPIS } from '@/lib/insights/kpi-registry';

describe('REIL 33 Underwriting KPIs: Track Record Wiring', () => {
  it('locks historical track record metrics to authoritative REIL 33 KPIs', () => {
    const trackRecord = getReil33KpiTrackRecord();

    expect(trackRecord.isLocked).toBe(true);
    expect(trackRecord.source).toContain('REIL 33 Underwriting KPIs');

    // 1. AUM ($M): Derived from REIL KPI #1 & #3
    expect(trackRecord.aumMillions).toBe(0);
    expect(trackRecord.metrics.aum.kpiNumber).toBe('KPI #1 & #3');
    expect(trackRecord.metrics.aum.formattedValue).toBe('$0M');

    // 2. Realized IRR %: Derived from REIL KPI #10
    expect(trackRecord.avgRoiPct).toBe(0);
    expect(trackRecord.metrics.irr.kpiNumber).toBe('KPI #10');
    expect(trackRecord.metrics.irr.formattedValue).toBe('0.0%');

    // 3. Equity Multiple: Derived from REIL KPI #11
    expect(trackRecord.equityMultiple).toBe(0);
    expect(trackRecord.metrics.equityMultiple.kpiNumber).toBe('KPI #11');
    expect(trackRecord.metrics.equityMultiple.formattedValue).toBe('0.00×');

    // 4. Exits / Closed Deals: Derived from REIL Phase 4 (KPIs #27–#33)
    expect(trackRecord.dealCount).toBe(0);
    expect(trackRecord.metrics.dealCount.kpiNumber).toBe('KPIs #27–#33');
    expect(trackRecord.metrics.dealCount.formattedValue).toBe('0 Deals');
  });

  it('aligns with AUTHORITATIVE_33_KPIS registry definitions', () => {
    const kpi1 = AUTHORITATIVE_33_KPIS.find((k) => k.number === 1);
    const kpi3 = AUTHORITATIVE_33_KPIS.find((k) => k.number === 3);
    const kpi10 = AUTHORITATIVE_33_KPIS.find((k) => k.number === 10);
    const kpi11 = AUTHORITATIVE_33_KPIS.find((k) => k.number === 11);

    expect(kpi1?.name).toBe('Gross Purchase Price');
    expect(kpi3?.name).toBe('Total Cost Basis');
    expect(kpi10?.name).toBe('Levered IRR');
    expect(kpi11?.name).toBe('Equity Multiple (MOIC)');
  });

  it('aggregates live project basis into AUM when projects are provided', () => {
    const mockProjects: any[] = [
      { id: 'p1', purchasePrice: 40_000_000, currentPhase: 'hold', status: 'Active' },
      { id: 'p2', purchasePrice: 60_000_000, currentPhase: 'exit', status: 'Completed', realizedIrr: 22.4, equityMultiple: 2.1 },
    ];

    const result = getReil33KpiTrackRecord(mockProjects);
    expect(result.aumMillions).toBe(100);
    expect(result.metrics.aum.formattedValue).toBe('$100M');
    expect(result.dealCount).toBe(1);
    expect(result.metrics.dealCount.formattedValue).toBe('1 Deals');
    expect(result.avgRoiPct).toBe(22.4);
    expect(result.metrics.irr.formattedValue).toBe('22.4%');
    expect(result.equityMultiple).toBe(2.1);
    expect(result.metrics.equityMultiple.formattedValue).toBe('2.1×');
    expect(result.isLocked).toBe(true);
  });

  it('returns honest uninitialized zero values when user has zero projects', () => {
    const emptyResult = getReil33KpiTrackRecord([]);
    expect(emptyResult.aumMillions).toBe(0);
    expect(emptyResult.metrics.aum.formattedValue).toBe('$0M');
    expect(emptyResult.avgRoiPct).toBe(0);
    expect(emptyResult.metrics.irr.formattedValue).toBe('0.0%');
    expect(emptyResult.equityMultiple).toBe(0);
    expect(emptyResult.metrics.equityMultiple.formattedValue).toBe('0.00×');
    expect(emptyResult.dealCount).toBe(0);
    expect(emptyResult.metrics.dealCount.formattedValue).toBe('0 Deals');
    expect(emptyResult.source).toContain('Uninitialized');
  });
});
