import {
  ATTORNEY_CLOSE_STATES_SEED,
  isAttorneyCloseState,
} from '@/lib/config/attorneyStates';
import {
  evaluateAttorneyBlockingLine,
  evaluateF6GateLines,
} from '@/lib/gates/fundGateLines';

describe('Card F4.2 — Attorney jurisdiction-gated', () => {
  /* ═══ Config utility ═════════════════════════════════════════════════════ */
  describe('isAttorneyCloseState', () => {
    it('matches seeded states case-insensitively', () => {
      expect(isAttorneyCloseState('NY', ATTORNEY_CLOSE_STATES_SEED)).toBe(true);
      expect(isAttorneyCloseState('ny', ATTORNEY_CLOSE_STATES_SEED)).toBe(true);
      expect(isAttorneyCloseState('Ga', ATTORNEY_CLOSE_STATES_SEED)).toBe(true);
      expect(isAttorneyCloseState('MA', ATTORNEY_CLOSE_STATES_SEED)).toBe(true);
    });

    it('rejects states not in the list', () => {
      expect(isAttorneyCloseState('CA', ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
      expect(isAttorneyCloseState('TX', ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
      expect(isAttorneyCloseState('FL', ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
    });

    it('handles null/undefined/empty', () => {
      expect(isAttorneyCloseState(null, ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
      expect(isAttorneyCloseState(undefined, ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
      expect(isAttorneyCloseState('', ATTORNEY_CLOSE_STATES_SEED)).toBe(false);
    });

    it('works with custom state lists (founder-editable)', () => {
      const custom = ['CA', 'TX'];
      expect(isAttorneyCloseState('CA', custom)).toBe(true);
      expect(isAttorneyCloseState('NY', custom)).toBe(false);
    });
  });

  /* ═══ Seed list ══════════════════════════════════════════════════════════ */
  describe('ATTORNEY_CLOSE_STATES_SEED', () => {
    it('includes the originally specified states (NY, GA, MA)', () => {
      expect(ATTORNEY_CLOSE_STATES_SEED).toContain('NY');
      expect(ATTORNEY_CLOSE_STATES_SEED).toContain('GA');
      expect(ATTORNEY_CLOSE_STATES_SEED).toContain('MA');
    });

    it('includes the commonly recognized set', () => {
      // The spec says "NY, GA, MA + commonly recognized set"
      const expectedSubset = ['NY', 'NJ', 'MA', 'CT', 'GA', 'SC', 'NC', 'IL'];
      for (const st of expectedSubset) {
        expect(ATTORNEY_CLOSE_STATES_SEED).toContain(st);
      }
    });

    it('contains only 2-letter uppercase codes', () => {
      for (const st of ATTORNEY_CLOSE_STATES_SEED) {
        expect(st).toMatch(/^[A-Z]{2}$/);
      }
    });
  });

  /* ═══ F6 Gate — Attorney blocking line ═══════════════════════════════════ */
  describe('evaluateAttorneyBlockingLine', () => {
    const states = ATTORNEY_CLOSE_STATES_SEED;

    it('is not blocked when state is not in the attorney list', () => {
      const result = evaluateAttorneyBlockingLine('CA', {}, states);
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('Not required');
    });

    it('is blocked when state is in the list but no attorney assigned', () => {
      const result = evaluateAttorneyBlockingLine('NY', {}, states);
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('attorney-close state');
    });

    it('is blocked when attorney slot is null', () => {
      const result = evaluateAttorneyBlockingLine('GA', { f4ClosingAttorneyVendor: null }, states);
      expect(result.blocked).toBe(true);
    });

    it('is blocked when attorney slot is empty string', () => {
      const result = evaluateAttorneyBlockingLine('MA', { f4ClosingAttorneyVendor: '' }, states);
      expect(result.blocked).toBe(true);
    });

    it('is NOT blocked when attorney is assigned (string value)', () => {
      const result = evaluateAttorneyBlockingLine('NY', {
        f4ClosingAttorneyVendor: 'Bob Smith Esq.',
      }, states);
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('Bob Smith Esq.');
    });

    it('is NOT blocked when attorney is assigned (structured record)', () => {
      const result = evaluateAttorneyBlockingLine('CT', {
        f4ClosingAttorneyVendor: {
          name: 'Jane Attorney',
          firm: 'Smith & Partners',
          source: 'marketplace',
          assignedAt: '2025-01-01',
          assignedBy: 'user_123',
        },
      }, states);
      expect(result.blocked).toBe(false);
      expect(result.reason).toContain('Jane Attorney');
    });
  });

  /* ═══ F6 Gate — full line evaluation ═════════════════════════════════════ */
  describe('evaluateF6GateLines', () => {
    const states = ATTORNEY_CLOSE_STATES_SEED;

    it('returns attorney line as blocked for unassigned attorney-close state', () => {
      const lines = evaluateF6GateLines({ state: 'NY', financials: {} }, states);
      const attorneyLine = lines.find((l) => l.key === 'attorney');
      expect(attorneyLine).toBeDefined();
      expect(attorneyLine!.blocked).toBe(true);
    });

    it('returns attorney line as NOT blocked for non-attorney state', () => {
      const lines = evaluateF6GateLines({ state: 'CA', financials: {} }, states);
      const attorneyLine = lines.find((l) => l.key === 'attorney');
      expect(attorneyLine).toBeDefined();
      expect(attorneyLine!.blocked).toBe(false);
    });

    it('returns attorney line as NOT blocked when attorney is assigned', () => {
      const lines = evaluateF6GateLines({
        state: 'NY',
        financials: { f4ClosingAttorneyVendor: 'Bob Esq.' },
      }, states);
      const attorneyLine = lines.find((l) => l.key === 'attorney');
      expect(attorneyLine!.blocked).toBe(false);
    });
  });
});
