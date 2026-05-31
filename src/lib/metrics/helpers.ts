/**
 * Shared helpers for structured metric wrappers.
 * Pure functions — no I/O, no React, no Firestore.
 */

import type { MetricState, MetricResult } from './types';

/**
 * Determine the MetricState from a project's currentPhase.
 *
 * Phase 1 (Find & Fund) → 'projected'
 * Phase 2 (Acquisition) → 'projected' (or 'actual' if purchase closed — caller decides)
 * Phase 3 (Hold)         → 'live'
 * Phase 4 (Exit)         → 'realized'
 * Unknown                → 'projected' (safe default)
 */
export function resolveState(currentPhase: number | undefined): MetricState {
  switch (currentPhase) {
    case 1: return 'projected';
    case 2: return 'projected'; // caller may override to 'actual' after close
    case 3: return 'live';
    case 4: return 'realized';
    default: return 'projected';
  }
}

/**
 * Build an incomplete MetricResult — used when required inputs are missing.
 */
export function incomplete(missing: string[]): MetricResult {
  return {
    value: null,
    state: 'incomplete',
    inputsUsed: {},
    inputsMissing: missing,
  };
}

/**
 * Build a not-applicable MetricResult — used when the metric does not apply.
 */
export function notApplicable(): MetricResult {
  return {
    value: null,
    state: 'n/a',
    inputsUsed: {},
    inputsMissing: [],
  };
}

/**
 * Safe number extraction — returns undefined for null/undefined/NaN.
 */
export function num(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Get a nested property from a project object using a dot-separated path.
 */
export function getPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Safe date parser — handles strings, numbers, Date objects, and Firestore Timestamps.
 */
export function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate();
  }
  if (typeof val === 'object' && val !== null && '_seconds' in val) {
    return new Date((val as any)._seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

