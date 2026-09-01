const PHASE_NAMES = ['', 'acquisition', 'purchase', 'hold', 'exit'] as const;

export function phaseNumberToName(phaseNumber: number): string {
  return PHASE_NAMES[phaseNumber] || 'acquisition';
}
