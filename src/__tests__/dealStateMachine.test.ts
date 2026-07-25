/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal State Machine Tests (DM-6)

   Pure function tests. No mocks, no Firestore, no setup.
   Every legal transition demonstrated.
   Every illegal transition rejected with reason.
   ═══════════════════════════════════════════════════════ */

import {
  evaluateTransition,
  evaluateVisibilityChange,
  isTerminalState,
  reachableStates,
  ALL_STATUSES,
  type TransitionRequest,
  type VisibilityChangeRequest,
} from '@/lib/deals/dealStateMachine';
import type { ListingStatus, VisibilityMode } from '@/types/listing';

describe('dealStateMachine', () => {
  // ── Legal Transitions ──────────────────────────────────

  describe('legal transitions', () => {
    const legalCases: Array<{
      from: ListingStatus;
      to: ListingStatus;
      actor: 'owner' | 'platform_admin';
      desc: string;
      expectedEffects: string[];
    }> = [
      {
        from: 'draft',
        to: 'published',
        actor: 'owner',
        desc: 'draft → published (owner)',
        expectedEffects: ['set_published_at', 'set_marketplace_listing_true'],
      },
      {
        from: 'draft',
        to: 'published',
        actor: 'platform_admin',
        desc: 'draft → published (admin)',
        expectedEffects: ['set_published_at', 'set_marketplace_listing_true'],
      },
      {
        from: 'published',
        to: 'paused',
        actor: 'owner',
        desc: 'published → paused (owner)',
        expectedEffects: ['set_paused_at', 'freeze_expressions'],
      },
      {
        from: 'paused',
        to: 'published',
        actor: 'owner',
        desc: 'paused → published (resume, owner)',
        expectedEffects: ['set_published_at', 'unfreeze_expressions'],
      },
      {
        from: 'published',
        to: 'closed',
        actor: 'owner',
        desc: 'published → closed (owner)',
        expectedEffects: [
          'set_closed_at',
          'decline_pending_expressions',
          'expire_invitations',
          'clear_active_listing',
          'set_marketplace_listing_false',
        ],
      },
      {
        from: 'paused',
        to: 'closed',
        actor: 'owner',
        desc: 'paused → closed (owner)',
        expectedEffects: [
          'set_closed_at',
          'decline_pending_expressions',
          'expire_invitations',
          'clear_active_listing',
          'set_marketplace_listing_false',
        ],
      },
      {
        from: 'published',
        to: 'withdrawn',
        actor: 'owner',
        desc: 'published → withdrawn (owner)',
        expectedEffects: [
          'set_withdrawn_at',
          'decline_pending_expressions',
          'expire_invitations',
          'purge_teaser_cache',
          'clear_active_listing',
          'set_marketplace_listing_false',
        ],
      },
      {
        from: 'paused',
        to: 'withdrawn',
        actor: 'owner',
        desc: 'paused → withdrawn (owner)',
        expectedEffects: [
          'set_withdrawn_at',
          'decline_pending_expressions',
          'expire_invitations',
          'purge_teaser_cache',
          'clear_active_listing',
          'set_marketplace_listing_false',
        ],
      },
      {
        from: 'draft',
        to: 'withdrawn',
        actor: 'owner',
        desc: 'draft → withdrawn (owner)',
        expectedEffects: ['set_withdrawn_at', 'clear_active_listing'],
      },
    ];

    it.each(legalCases)('$desc → allowed with correct side effects', ({ from, to, actor, expectedEffects }) => {
      const result = evaluateTransition({ from, to, actorRole: actor });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.sideEffects.map((e) => e.type)).toEqual(expectedEffects);
    });
  });

  // ── Illegal Transitions ────────────────────────────────

  describe('illegal transitions', () => {
    const illegalCases: Array<{
      from: ListingStatus;
      to: ListingStatus;
      actor: 'owner' | 'platform_admin';
      desc: string;
      expectedReasonContains: string;
    }> = [
      // Terminal states cannot transition to anything
      {
        from: 'closed',
        to: 'draft',
        actor: 'owner',
        desc: 'closed → draft (terminal)',
        expectedReasonContains: 'terminal state',
      },
      {
        from: 'closed',
        to: 'published',
        actor: 'owner',
        desc: 'closed → published (terminal)',
        expectedReasonContains: 'terminal state',
      },
      {
        from: 'closed',
        to: 'paused',
        actor: 'owner',
        desc: 'closed → paused (terminal)',
        expectedReasonContains: 'terminal state',
      },
      {
        from: 'closed',
        to: 'withdrawn',
        actor: 'owner',
        desc: 'closed → withdrawn (terminal)',
        expectedReasonContains: 'terminal state',
      },
      {
        from: 'withdrawn',
        to: 'draft',
        actor: 'owner',
        desc: 'withdrawn → draft (irreversible)',
        expectedReasonContains: 'irreversible',
      },
      {
        from: 'withdrawn',
        to: 'published',
        actor: 'owner',
        desc: 'withdrawn → published (irreversible)',
        expectedReasonContains: 'irreversible',
      },
      {
        from: 'withdrawn',
        to: 'paused',
        actor: 'owner',
        desc: 'withdrawn → paused (irreversible)',
        expectedReasonContains: 'irreversible',
      },
      {
        from: 'withdrawn',
        to: 'closed',
        actor: 'owner',
        desc: 'withdrawn → closed (irreversible)',
        expectedReasonContains: 'irreversible',
      },
      // No backward from published to draft
      {
        from: 'published',
        to: 'draft',
        actor: 'owner',
        desc: 'published → draft (illegal)',
        expectedReasonContains: 'not a legal state change',
      },
      // No draft → closed (use delete or withdraw instead)
      {
        from: 'draft',
        to: 'closed',
        actor: 'owner',
        desc: 'draft → closed (illegal — use withdraw)',
        expectedReasonContains: 'not a legal state change',
      },
      // No draft → paused
      {
        from: 'draft',
        to: 'paused',
        actor: 'owner',
        desc: 'draft → paused (illegal)',
        expectedReasonContains: 'not a legal state change',
      },
      // No paused → draft
      {
        from: 'paused',
        to: 'draft',
        actor: 'owner',
        desc: 'paused → draft (illegal)',
        expectedReasonContains: 'not a legal state change',
      },
    ];

    it.each(illegalCases)('$desc → rejected', ({ from, to, actor, expectedReasonContains }) => {
      const result = evaluateTransition({ from, to, actorRole: actor });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.toLowerCase()).toContain(expectedReasonContains.toLowerCase());
      expect(result.sideEffects).toEqual([]);
    });
  });

  // ── Identity Transitions ───────────────────────────────

  describe('identity transitions (no-ops)', () => {
    it.each(ALL_STATUSES)('"%s" → "%s" is rejected', (status) => {
      const result = evaluateTransition({ from: status, to: status, actorRole: 'owner' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      // Terminal states are rejected for being terminal; non-terminal for being identity
      if (isTerminalState(status)) {
        expect(result.reason!.toLowerCase()).toContain('terminal state');
      } else {
        expect(result.reason).toContain('already in state');
      }
    });
  });

  // ── Terminal State Helpers ─────────────────────────────

  describe('isTerminalState', () => {
    it('closed is terminal', () => expect(isTerminalState('closed')).toBe(true));
    it('withdrawn is terminal', () => expect(isTerminalState('withdrawn')).toBe(true));
    it('draft is not terminal', () => expect(isTerminalState('draft')).toBe(false));
    it('published is not terminal', () => expect(isTerminalState('published')).toBe(false));
    it('paused is not terminal', () => expect(isTerminalState('paused')).toBe(false));
  });

  describe('reachableStates', () => {
    it('draft can reach published and withdrawn', () => {
      expect(reachableStates('draft').sort()).toEqual(['published', 'withdrawn'].sort());
    });
    it('published can reach paused, closed, and withdrawn', () => {
      expect(reachableStates('published').sort()).toEqual(['closed', 'paused', 'withdrawn'].sort());
    });
    it('paused can reach published, closed, and withdrawn', () => {
      expect(reachableStates('paused').sort()).toEqual(['closed', 'published', 'withdrawn'].sort());
    });
    it('closed reaches nothing', () => {
      expect(reachableStates('closed')).toEqual([]);
    });
    it('withdrawn reaches nothing', () => {
      expect(reachableStates('withdrawn')).toEqual([]);
    });
  });
});

// ── Visibility Mode Tests ────────────────────────────────

describe('evaluateVisibilityChange', () => {
  describe('legal visibility changes', () => {
    it('PRIVATE → MARKETPLACE allowed', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PRIVATE',
        targetMode: 'MARKETPLACE',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(true);
    });

    it('MARKETPLACE → PRIVATE allowed (tightening)', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'MARKETPLACE',
        targetMode: 'PRIVATE',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('illegal visibility changes', () => {
    it('PUBLIC_SOLICITED → PRIVATE rejected (irreversible)', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PUBLIC_SOLICITED',
        targetMode: 'PRIVATE',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('irreversible');
    });

    it('PUBLIC_SOLICITED → MARKETPLACE rejected (irreversible)', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PUBLIC_SOLICITED',
        targetMode: 'MARKETPLACE',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('irreversible');
    });

    it('PRIVATE → PUBLIC_SOLICITED allowed', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PRIVATE',
        targetMode: 'PUBLIC_SOLICITED',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(true);
    });

    it('MARKETPLACE → PUBLIC_SOLICITED allowed', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'MARKETPLACE',
        targetMode: 'PUBLIC_SOLICITED',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(true);
    });

    it('identity change rejected', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PRIVATE',
        targetMode: 'PRIVATE',
        listingStatus: 'published',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already in visibility mode');
    });

    it('visibility change on closed listing rejected', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PRIVATE',
        targetMode: 'MARKETPLACE',
        listingStatus: 'closed',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('closed');
    });

    it('visibility change on withdrawn listing rejected', () => {
      const result = evaluateVisibilityChange({
        currentMode: 'PRIVATE',
        targetMode: 'MARKETPLACE',
        listingStatus: 'withdrawn',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('withdrawn');
    });
  });
});
