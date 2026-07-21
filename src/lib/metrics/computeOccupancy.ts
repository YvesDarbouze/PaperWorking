/**
 * D8 — Occupancy Rate wrapper.
 * Handles three modes: unit-based, day-based, and vacancy-assumption fallback.
 * Delegates to reiMetrics.computeOccupancyRate.
 */

import type { MetricResult } from './types';
import { computeOccupancyRate } from './reiMetrics';
import { resolveState, num } from './helpers';

export interface OccupancyProjectInput {
  financials?: {
    numberOfUnits?: number;
    occupiedUnits?: number;
    vacancyRatePercent?: number;
    vacancyRate?: number;
    daysOccupied?: number;
    totalHoldDays?: number;
    [key: string]: any;
  };
  currentPhase?: number;
  dispositionType?: string;
  [key: string]: any;
}

export function computeOccupancyMetric(project: OccupancyProjectInput): MetricResult {
  const fin = project.financials;

  const rawDisp = project.dispositionType;
  const mappedDisp: Record<string, string> = {
    'Buy & Hold': 'RENT',
    'Rent': 'RENT',
    'Fix & Flip': 'SALE',
    'Sell': 'SALE',
    'Wholesale': 'SALE',
    'buy-and-hold': 'RENT',
    'LTR': 'RENT',
  };
  const dispositionType = rawDisp ? (mappedDisp[rawDisp] ?? rawDisp) : undefined;

  // Flip/sell strategies → occupancy is 0 by definition
  if (dispositionType === 'SALE') {
    return {
      value: 0,
      state: resolveState(project.currentPhase),
      inputsUsed: {},
      inputsMissing: [],
    };
  }

  // Mode 1: day-based occupancy (actual tracking)
  const daysOccupied = num(fin?.daysOccupied);
  const totalHoldDays = num(fin?.totalHoldDays);
  if (daysOccupied !== undefined && totalHoldDays !== undefined && totalHoldDays > 0) {
    const rate = Math.round((daysOccupied / totalHoldDays) * 100 * 100) / 100;
    return {
      value: rate,
      state: resolveState(project.currentPhase),
      inputsUsed: {
        'financials.daysOccupied': daysOccupied,
        'financials.totalHoldDays': totalHoldDays,
      },
      inputsMissing: [],
    };
  }

  // Mode 2: unit-based occupancy
  const numberOfUnits = num(fin?.numberOfUnits) ?? 1;
  const occupiedUnits = num(fin?.occupiedUnits) ?? numberOfUnits;
  const unitOccupancy = computeOccupancyRate(occupiedUnits, numberOfUnits);

  // Mode 3: vacancy assumption fallback
  const vacancyPct = num(fin?.vacancyRatePercent) ?? num(fin?.vacancyRate) ?? 7;
  let occupancy: number;

  if (unitOccupancy === 100 && vacancyPct > 0) {
    occupancy = 100 - vacancyPct;
  } else {
    occupancy = unitOccupancy;
  }

  const inputsUsed: Record<string, number> = {};
  if (fin?.numberOfUnits !== undefined) inputsUsed['financials.numberOfUnits'] = numberOfUnits;
  if (fin?.occupiedUnits !== undefined) inputsUsed['financials.occupiedUnits'] = occupiedUnits;
  inputsUsed['financials.vacancyRatePercent'] = vacancyPct;

  return {
    value: occupancy,
    state: resolveState(project.currentPhase),
    inputsUsed,
    inputsMissing: [],
  };
}
