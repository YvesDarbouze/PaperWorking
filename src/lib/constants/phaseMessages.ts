/**
 * PaperWorking 7-Phase Lifecycle constants.
 * Single source of truth for backgrounds, value messages, and unlock gates.
 */

/**
 * 7-phase grayscale palette: evenly distributed from #CCCCCC (lightest) to #595959 (darkest).
 * Step size: (204 − 89) / 6 ≈ 19 units per phase.
 */
export const PHASE_BACKGROUNDS: Record<string, string> = {
  findandfund: '#CCCCCC', // step 0 — lightest
  pipeline:    '#B9B9B9', // step 1
  evaluation:  '#A6A6A6', // step 2
  closing:     '#939393', // step 3
  rehab:       '#808080', // step 4 — dark threshold
  engine:      '#6D6D6D', // step 5
  exit:        '#595959', // step 6 — darkest
};

/**
 * True when the phase background value is ≤ 128 (50% gray), requiring white text.
 * Rule: #595959 (#808080, #6D6D6D) → white; #939393+ → #1A1A1A.
 */
export const PHASE_IS_DARK: Record<string, boolean> = {
  rehab:  true, // #808080
  engine: true, // #6D6D6D
  exit:   true, // #595959
};

export const PHASE_MESSAGES: Record<string, string> = {
  findandfund:  'Finding the right deal is 70% of your profit. Every day your capital sits idle is a day it\'s not working.',
  pipeline:     'Your pipeline is your deal factory. Visibility into each deal\'s velocity tells you where to focus first.',
  evaluation:   'Precise underwriting prevents costly surprises. Your projected ROI only holds if your numbers do.',
  closing:      'Clear-to-close is the last gate before capital is deployed. Every verified document protects your equity.',
  rehab:        'Rehab cost variance directly impacts net profit. Accurate actuals here keep your ROI projection honest.',
  engine:       'Operational efficiency compounds. Every system you build here multiplies your future deal capacity.',
  exit:         'Your exit strategy determines your realized return. Pricing precision at this stage is your final ROI lever.',
};

/**
 * Human-readable unlock conditions used in gate-blocked toast messages.
 * Key = lane that is locked; value = the condition that unlocks it.
 */
export const PHASE_UNLOCK_HINTS: Record<string, string> = {
  pipeline:   'Add your first project to unlock the Deal Pipeline.',
  evaluation: 'Put a deal Under Contract to unlock Capital & Evaluation.',
  closing:    'Receive Clear-to-Close approval to unlock The Closing Room.',
  rehab:      'Complete closing on a deal to unlock The Rehab Engine.',
  exit:       'List a property for sale to unlock The Exit Hub.',
};
