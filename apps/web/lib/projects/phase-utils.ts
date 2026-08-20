import { REILPhase, toLegacyPhase } from '@paperworking/shared';
import type { LegacyProjectPhase } from './types';

export const PHASE_LABELS: Record<LegacyProjectPhase, string> = {
  acquisition: 'Acquisition',
  purchase: 'Fund',
  hold: 'Hold',
  exit: 'Exit',
};

export const PHASE_COLORS: Record<LegacyProjectPhase, { bg: string; text: string; shell: string }> = {
  acquisition: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', shell: '#1a3a5c' },
  purchase: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', shell: '#2d5a3d' },
  hold: { bg: 'rgba(249,115,22,0.15)', text: '#F97316', shell: '#8b6914' },
  exit: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', shell: '#5c1a1a' },
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function legacyPhaseFromReil(phase: REILPhase): LegacyProjectPhase {
  return toLegacyPhase(phase);
}

export function reilPhaseOrderLabels(): { phase: REILPhase; legacy: LegacyProjectPhase; label: string }[] {
  return [
    { phase: REILPhase.ACQUISITION, legacy: 'acquisition', label: 'Acquisition' },
    { phase: REILPhase.FUND, legacy: 'purchase', label: 'Fund' },
    { phase: REILPhase.HOLD, legacy: 'hold', label: 'Hold' },
    { phase: REILPhase.EXIT, legacy: 'exit', label: 'Exit' },
  ];
}
