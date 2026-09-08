/**
 * Behavioral state machine for Ava's 4-phase UX lifecycle (§7).
 *
 * Transitions:
 * Phase 1: LAUNCHER & PROACTIVE PULSE (dialog bubble, bottom-right, pulses once per session per surface)
 * Phase 2: INTENT CAPTURE (drawer expands ~30% viewport, high-intent categorized prompt chips)
 * Phase 3: SPLIT-VIEW EXECUTION (panel locks, builds skeleton in real workspace, narrating progress)
 * Phase 4: MINIMIZATION & GHOST TEXT (auto-minimizes to pill; inline copilot on user stall; Tab accepts)
 */

export type UXPhase =
  | 'PHASE_1_LAUNCHER'
  | 'PHASE_2_INTENT'
  | 'PHASE_3_SPLIT_VIEW'
  | 'PHASE_4_MINIMIZED';

export interface PromptChip {
  id: string;
  label: string;
  category: 'Getting started' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit/Portfolio' | 'Account';
  intentKey: string;
  description?: string;
}

export const HIGH_INTENT_CHIPS: PromptChip[] = [
  // Getting started
  {
    id: 'chip-switch-spreadsheets',
    category: 'Getting started',
    label: 'Switch from spreadsheets mid-deal',
    intentKey: 'switch_spreadsheets',
    description: 'Transition active deal in under 20 minutes',
  },
  {
    id: 'chip-import-csv',
    category: 'Getting started',
    label: 'Import my deals via CSV',
    intentKey: 'import_csv',
    description: 'Bulk upload historical deal records',
  },

  // Acquisition
  {
    id: 'chip-analyze-first-deal',
    category: 'Acquisition',
    label: 'Analyze my first deal',
    intentKey: 'analyze_deal',
    description: 'Run automated valuation and instant cap rate',
  },
  {
    id: 'chip-run-deal-calc',
    category: 'Acquisition',
    label: 'Run the Deal Calculator on an address',
    intentKey: 'deal_calculator',
    description: 'Stress-test rent and rehab budget',
  },

  // Fund
  {
    id: 'chip-contingency-deadline',
    category: 'Fund',
    label: 'Track a contingency deadline',
    intentKey: 'track_contingency',
    description: 'Earnest money and inspection countdowns',
  },
  {
    id: 'chip-setup-vault',
    category: 'Fund',
    label: 'Set up my document vault',
    intentKey: 'setup_vault',
    description: 'Secure document verification states',
  },

  // Hold
  {
    id: 'chip-contractor-draw',
    category: 'Hold',
    label: 'Log a contractor draw',
    intentKey: 'contractor_draw',
    description: 'Scoped contractor draw approval flow',
  },
  {
    id: 'chip-connect-plaid',
    category: 'Hold',
    label: 'Connect my bank with Plaid',
    intentKey: 'connect_plaid',
    description: 'Optional automated transaction sync',
  },
  {
    id: 'chip-fix-misclassification',
    category: 'Hold',
    label: 'Fix a revenue vs. expense misclassification',
    intentKey: 'fix_classification',
    description: 'Reclassify recurring ledger transactions',
  },

  // Exit/Portfolio
  {
    id: 'chip-explain-33-kpis',
    category: 'Exit/Portfolio',
    label: 'Explain the 33 Insights KPIs',
    intentKey: 'explain_kpis',
    description: 'Institutional metrics grounded in the Playbook',
  },
  {
    id: 'chip-export-schedule-e',
    category: 'Exit/Portfolio',
    label: 'Export a CPA-ready Schedule E',
    intentKey: 'export_schedule_e',
    description: 'IRS Schedule E and Form 4797 mapping',
  },
  {
    id: 'chip-phase-gate-blocked',
    category: 'Exit/Portfolio',
    label: 'Why is my deal blocked at a phase gate?',
    intentKey: 'phase_gate_blocked',
    description: 'Hurdle logic and authorized overrides',
  },

  // Account
  {
    id: 'chip-understand-billing',
    category: 'Account',
    label: 'Understand billing & plans',
    intentKey: 'understand_billing',
    description: 'Investor ($499/yr), Team ($999/yr), Vendor ($390/yr)',
  },
  {
    id: 'chip-invite-team',
    category: 'Account',
    label: 'Invite my team & CPA',
    intentKey: 'invite_team',
    description: 'Role-based access & read-only CPA seats',
  },
];

/**
 * Storage key to track proactive pulse per session per surface.
 */
export function getPulseSessionKey(surface: string): string {
  return `pw_pulse_dismissed_${surface}`;
}

export function hasPulseBeenDismissed(surface = 'default'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(getPulseSessionKey(surface)) === 'true';
  } catch {
    return false;
  }
}

export function markPulseDismissed(surface = 'default'): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getPulseSessionKey(surface), 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Autoscroll helper: checks if an element is scrolled close to its bottom.
 */
export function isScrolledToBottom(element: HTMLElement, thresholdPx = 40): boolean {
  const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return scrollBottom <= thresholdPx;
}

/**
 * Stall detector helper: checks if idle duration exceeds stall threshold.
 */
export function isUserStalled(idleMs: number, thresholdMs = 4000): boolean {
  return idleMs >= thresholdMs;
}
