/**
 * Business-canonical REIL lifecycle phases.
 * Legacy code uses `purchase` where business spec uses FUND.
 */
export enum REILPhase {
  ACQUISITION = 'ACQUISITION',
  FUND = 'FUND',
  HOLD = 'HOLD',
  EXIT = 'EXIT',
}

/** Legacy phase values from existing PaperWorking codebase */
export type LegacyREIPhase = 'acquisition' | 'purchase' | 'hold' | 'exit';

export const LEGACY_TO_CANONICAL: Record<LegacyREIPhase, REILPhase> = {
  acquisition: REILPhase.ACQUISITION,
  purchase: REILPhase.FUND,
  hold: REILPhase.HOLD,
  exit: REILPhase.EXIT,
};

export const CANONICAL_TO_LEGACY: Record<REILPhase, LegacyREIPhase> = {
  [REILPhase.ACQUISITION]: 'acquisition',
  [REILPhase.FUND]: 'purchase',
  [REILPhase.HOLD]: 'hold',
  [REILPhase.EXIT]: 'exit',
};

export const REIL_PHASE_ORDER: REILPhase[] = [
  REILPhase.ACQUISITION,
  REILPhase.FUND,
  REILPhase.HOLD,
  REILPhase.EXIT,
];

export function toCanonicalPhase(legacy: LegacyREIPhase): REILPhase {
  return LEGACY_TO_CANONICAL[legacy];
}

export function toLegacyPhase(canonical: REILPhase): LegacyREIPhase {
  return CANONICAL_TO_LEGACY[canonical];
}
