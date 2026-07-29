/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal State Machine (DM-6)

   Pure function. No I/O. No Firestore. No side effects.
   This is the ONLY code path that decides whether a
   Deal listing transition is legal. The caller executes
   the side effects declared in the result.
   ═══════════════════════════════════════════════════════ */

import type { ListingStatus, VisibilityMode } from '@/types/listing';

// ── Side Effect Declarations ────────────────────────────
// These describe WHAT should happen — the caller does it.

export type SideEffectType =
  | 'set_published_at'
  | 'set_paused_at'
  | 'set_closed_at'
  | 'set_withdrawn_at'
  | 'clear_active_listing'
  | 'set_marketplace_listing_true'
  | 'set_marketplace_listing_false'
  | 'decline_pending_expressions'
  | 'expire_invitations'
  | 'freeze_expressions'
  | 'unfreeze_expressions'
  | 'purge_teaser_cache';

export interface SideEffect {
  type: SideEffectType;
}

// ── Actor Roles ─────────────────────────────────────────

export type TransitionActor = 'owner' | 'platform_admin';

// ── Transition Request & Result ─────────────────────────

export interface TransitionRequest {
  from: ListingStatus;
  to: ListingStatus;
  actorRole: TransitionActor;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  sideEffects: SideEffect[];
}

// ── Visibility Change Request & Result ──────────────────

export interface VisibilityChangeRequest {
  currentMode: VisibilityMode;
  targetMode: VisibilityMode;
  listingStatus: ListingStatus;
}

export interface VisibilityChangeResult {
  allowed: boolean;
  reason?: string;
  irreversible?: boolean;
}

// ── Legal Transition Definitions ────────────────────────

interface TransitionDef {
  from: ListingStatus;
  to: ListingStatus;
  allowedActors: TransitionActor[];
  sideEffects: SideEffect[];
}

const LEGAL_TRANSITIONS: TransitionDef[] = [
  // draft → published
  {
    from: 'draft',
    to: 'published',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_published_at' },
      { type: 'set_marketplace_listing_true' },
    ],
  },

  // published → paused
  {
    from: 'published',
    to: 'paused',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_paused_at' },
      { type: 'freeze_expressions' },
    ],
  },

  // paused → published (resume)
  {
    from: 'paused',
    to: 'published',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_published_at' },
      { type: 'unfreeze_expressions' },
    ],
  },

  // published → closed
  {
    from: 'published',
    to: 'closed',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_closed_at' },
      { type: 'decline_pending_expressions' },
      { type: 'expire_invitations' },
      { type: 'clear_active_listing' },
      { type: 'set_marketplace_listing_false' },
    ],
  },

  // paused → closed
  {
    from: 'paused',
    to: 'closed',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_closed_at' },
      { type: 'decline_pending_expressions' },
      { type: 'expire_invitations' },
      { type: 'clear_active_listing' },
      { type: 'set_marketplace_listing_false' },
    ],
  },

  // published → withdrawn
  {
    from: 'published',
    to: 'withdrawn',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_withdrawn_at' },
      { type: 'decline_pending_expressions' },
      { type: 'expire_invitations' },
      { type: 'purge_teaser_cache' },
      { type: 'clear_active_listing' },
      { type: 'set_marketplace_listing_false' },
    ],
  },

  // paused → withdrawn
  {
    from: 'paused',
    to: 'withdrawn',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_withdrawn_at' },
      { type: 'decline_pending_expressions' },
      { type: 'expire_invitations' },
      { type: 'purge_teaser_cache' },
      { type: 'clear_active_listing' },
      { type: 'set_marketplace_listing_false' },
    ],
  },

  // draft → withdrawn
  {
    from: 'draft',
    to: 'withdrawn',
    allowedActors: ['owner', 'platform_admin'],
    sideEffects: [
      { type: 'set_withdrawn_at' },
      { type: 'clear_active_listing' },
    ],
  },
];

// ── Terminal States ─────────────────────────────────────
// These states cannot transition to anything.

const TERMINAL_STATES: ReadonlySet<ListingStatus> = new Set(['closed', 'withdrawn']);

// ── Core Evaluator ──────────────────────────────────────

/**
 * Evaluates whether a Deal listing state transition is legal.
 * Pure function — no I/O, no mutations.
 *
 * @param req - The transition request
 * @returns TransitionResult with allowed flag, reason, and side effects
 */
export function evaluateTransition(req: TransitionRequest): TransitionResult {
  // 1. Terminal state check
  if (TERMINAL_STATES.has(req.from)) {
    return {
      allowed: false,
      reason: `Cannot transition from terminal state "${req.from}". ${req.from === 'withdrawn' ? 'Withdrawal is irreversible.' : 'Create a new listing instead.'}`,
      sideEffects: [],
    };
  }

  // 2. Identity transition (no-op)
  if (req.from === req.to) {
    return {
      allowed: false,
      reason: `Listing is already in state "${req.from}".`,
      sideEffects: [],
    };
  }

  // 3. Find matching legal transition
  const match = LEGAL_TRANSITIONS.find(
    (t) => t.from === req.from && t.to === req.to,
  );

  if (!match) {
    return {
      allowed: false,
      reason: `Transition from "${req.from}" to "${req.to}" is not a legal state change.`,
      sideEffects: [],
    };
  }

  // 4. Actor role check
  if (!match.allowedActors.includes(req.actorRole)) {
    return {
      allowed: false,
      reason: `Actor role "${req.actorRole}" is not authorized for transition "${req.from}" → "${req.to}".`,
      sideEffects: [],
    };
  }

  // 5. Allowed
  return {
    allowed: true,
    sideEffects: match.sideEffects,
  };
}

// ── Visibility Mode Evaluator ───────────────────────────

/**
 * Evaluates whether a visibility mode change is legal.
 * Pure function — no I/O, no mutations.
 *
 * Rules:
 * - Tightening (loosening scope down) is always allowed: MARKETPLACE → PRIVATE
 * - Loosening to PUBLIC_SOLICITED is irreversible
 * - Once PUBLIC_SOLICITED, no changes allowed
 * - Visibility changes only allowed on non-terminal listings
 */
export function evaluateVisibilityChange(req: VisibilityChangeRequest): VisibilityChangeResult {
  // Cannot change visibility on terminal-state listings
  if (TERMINAL_STATES.has(req.listingStatus)) {
    return {
      allowed: false,
      reason: `Cannot change visibility of a "${req.listingStatus}" listing.`,
    };
  }

  // Identity check
  if (req.currentMode === req.targetMode) {
    return {
      allowed: false,
      reason: `Listing is already in visibility mode "${req.currentMode}".`,
    };
  }

  // PUBLIC_SOLICITED is irreversible
  if (req.currentMode === 'PUBLIC_SOLICITED') {
    return {
      allowed: false,
      reason: 'PUBLIC_SOLICITED is irreversible. Once a deal has been publicly solicited, it cannot be made private or marketplace-only.',
    };
  }

  // PRIVATE ↔ MARKETPLACE ↔ PUBLIC_SOLICITED transitions are allowed
  return {
    allowed: true,
  };
}

// ── Helpers ─────────────────────────────────────────────

/** Returns true if the given status is a terminal state. */
export function isTerminalState(status: ListingStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/** Returns the set of states reachable from the given status. */
export function reachableStates(from: ListingStatus): ListingStatus[] {
  if (TERMINAL_STATES.has(from)) return [];
  return LEGAL_TRANSITIONS
    .filter((t) => t.from === from)
    .map((t) => t.to);
}

/** All ListingStatus values. */
export const ALL_STATUSES: readonly ListingStatus[] = [
  'draft', 'published', 'paused', 'closed', 'withdrawn',
] as const;
