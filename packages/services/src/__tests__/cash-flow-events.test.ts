import { describe, expect, it } from '@jest/globals';
import { deriveAllProjectMetrics } from '@paperworking/financial-engine';
import { buildProjectKpiEngineInputs } from '../projects/build-project-kpi-engine-inputs.js';
import {
  computeEquityMultipleFromEngineEvents,
  parseStoredCashFlowEvents,
  serializeCashFlowEventsForPersistence,
  storedEventsToEngineEvents,
  validateCashFlowEvent,
  validateCashFlowEventSchedule,
} from '@paperworking/financial-engine';

const SAMPLE_SCHEDULE = [
  { id: 'cf-1', date: '2026-01-01', amount: 100_000, type: 'investment' as const },
  { id: 'cf-2', date: '2026-03-01', amount: 10_000, type: 'investment' as const },
  {
    id: 'cf-3',
    date: '2027-01-01',
    amount: 140_000,
    type: 'return' as const,
    description: 'Sale proceeds',
  },
];

describe('cash-flow-events', () => {
  it('maps UI events to signed engine events', () => {
    const engine = storedEventsToEngineEvents(SAMPLE_SCHEDULE);
    expect(engine).toEqual([
      { date: '2026-01-01', amount: -100_000 },
      { date: '2026-03-01', amount: -10_000 },
      { date: '2027-01-01', amount: 140_000 },
    ]);
  });

  it('computes equity multiple from engine events', () => {
    const engine = storedEventsToEngineEvents(SAMPLE_SCHEDULE);
    expect(computeEquityMultipleFromEngineEvents(engine)).toBeCloseTo(1.27, 2);
  });

  it('parses stored financials and maps through KPI engine inputs', () => {
    const inputs = buildProjectKpiEngineInputs({
      id: 'p-cf',
      purchasePrice: 400_000,
      financials: { cashFlowEvents: SAMPLE_SCHEDULE },
    });
    expect(inputs.cash_flow_events).toEqual(storedEventsToEngineEvents(SAMPLE_SCHEDULE));
  });

  it('derives IRR and equity multiple from known schedule via engine', async () => {
    const engineInputs = buildProjectKpiEngineInputs({
      id: 'p-irr',
      financials: { cashFlowEvents: SAMPLE_SCHEDULE },
    });
    const metrics = await deriveAllProjectMetrics('p-irr', { mockData: engineInputs });
    expect(metrics.scorecard.irr.value).not.toBeNull();
    expect(metrics.insights.financial.equityMultiple.value).toBeCloseTo(1.27, 2);
  });

  it('returns N/A IRR and equity multiple without events', async () => {
    const metrics = await deriveAllProjectMetrics('p-empty', {
      mockData: buildProjectKpiEngineInputs({
        id: 'p-empty',
        purchasePrice: 400_000,
        financials: {},
      }),
    });
    expect(metrics.scorecard.irr.value).toBeNull();
    expect(metrics.insights.financial.equityMultiple.value).toBeNull();
  });

  it('returns N/A when only investment events exist', async () => {
    const onlyInvest = [
      { id: 'a', date: '2026-01-01', amount: 50_000, type: 'investment' as const },
      { id: 'b', date: '2026-06-01', amount: 25_000, type: 'investment' as const },
    ];
    const metrics = await deriveAllProjectMetrics('p-inv', {
      mockData: buildProjectKpiEngineInputs({
        id: 'p-inv',
        financials: { cashFlowEvents: onlyInvest },
      }),
    });
    expect(metrics.scorecard.irr.value).toBeNull();
    expect(metrics.insights.financial.equityMultiple.value).toBeNull();
  });

  it('returns N/A when only return events exist', async () => {
    const onlyReturn = [
      { id: 'a', date: '2026-01-01', amount: 50_000, type: 'return' as const },
    ];
    const metrics = await deriveAllProjectMetrics('p-ret', {
      mockData: buildProjectKpiEngineInputs({
        id: 'p-ret',
        financials: { cashFlowEvents: onlyReturn },
      }),
    });
    expect(metrics.scorecard.irr.value).toBeNull();
    expect(metrics.insights.financial.equityMultiple.value).toBeNull();
  });

  it('validates required fields', () => {
    expect(validateCashFlowEvent({})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'id' }),
        expect.objectContaining({ field: 'date' }),
        expect.objectContaining({ field: 'amount' }),
        expect.objectContaining({ field: 'type' }),
      ]),
    );
    expect(validateCashFlowEvent({ id: 'x', date: '2026-13-40', amount: 0, type: 'bad' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'date' }),
        expect.objectContaining({ field: 'amount' }),
        expect.objectContaining({ field: 'type' }),
      ]),
    );
  });

  it('validates schedule array and duplicate ids', () => {
    const dupes = [
      { id: 'same', date: '2026-01-01', amount: 1000, type: 'investment' },
      { id: 'same', date: '2027-01-01', amount: 2000, type: 'return' },
    ];
    const errors = validateCashFlowEventSchedule(dupes);
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
  });

  it('preserves unrelated financial fields when serializing events only', () => {
    const serialized = serializeCashFlowEventsForPersistence(SAMPLE_SCHEDULE);
    expect(serialized[0]?.amount).toBe(100_000);
    expect(parseStoredCashFlowEvents({ cashFlowEvents: serialized, monthlyGrossRent: 3500 })).toHaveLength(3);
  });
});
