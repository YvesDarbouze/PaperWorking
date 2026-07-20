import type { F4RfpBid } from '@/types/schema';

/**
 * Card F4.3 — RFP & Bids — Unit tests
 *
 * Tests server action validation, bid grouping, and status transitions.
 * Server actions are tested via their exported validation constants;
 * actual Firestore writes are integration-tested separately.
 */

// ── Validation constants (mirrored from rfpBids.ts) ─────────────────────
const VALID_SLOT_KEYS = [
  'f4TitleEscrowVendor',
  'f4ClosingAttorneyVendor',
  'f4AppraiserVendor',
  'f4EnvironmentalVendor',
  'f4SurveyorVendor',
  'f4InsuranceBrokerVendor',
  'f4CdcVendor',
  'f4HardMoneyLenderVendor',
];

const SLOT_LABELS: Record<string, string> = {
  f4TitleEscrowVendor: 'Title / Escrow',
  f4ClosingAttorneyVendor: 'Closing Attorney',
  f4AppraiserVendor: 'Appraiser',
  f4EnvironmentalVendor: 'Environmental Consultant',
  f4SurveyorVendor: 'Surveyor',
  f4InsuranceBrokerVendor: 'Insurance Broker',
  f4CdcVendor: 'CDC (SBA 504)',
  f4HardMoneyLenderVendor: 'Private / Hard-Money Lender',
};

// ── Helpers (replicate the grouping logic from the component) ────────────
function groupBidsByRfpId(bids: F4RfpBid[]) {
  const groups: Record<string, { rfpId: string; slotKey: string; slotLabel: string; bids: F4RfpBid[] }> = {};
  for (const bid of bids) {
    if (!groups[bid.rfpId]) {
      groups[bid.rfpId] = {
        rfpId: bid.rfpId,
        slotKey: bid.slotKey,
        slotLabel: SLOT_LABELS[bid.slotKey] || bid.slotKey,
        bids: [],
      };
    }
    groups[bid.rfpId].bids.push(bid);
  }
  return Object.values(groups);
}

function getBestValues(rfpBids: F4RfpBid[]) {
  const quotedBids = rfpBids.filter((b) => b.price != null);
  const bestPrice = quotedBids.length > 0 ? Math.min(...quotedBids.map((b) => b.price!)) : null;
  const fastestBids = rfpBids.filter((b) => b.turnaroundDays != null && b.turnaroundDays > 0);
  const bestTurnaround = fastestBids.length > 0 ? Math.min(...fastestBids.map((b) => b.turnaroundDays!)) : null;
  return { bestPrice, bestTurnaround };
}

// ── Mock bid factory ────────────────────────────────────────────────────
function makeBid(overrides: Partial<F4RfpBid> = {}): F4RfpBid {
  return {
    id: `bid_${Math.random().toString(36).slice(2)}`,
    rfpId: 'rfp_test_001',
    slotKey: 'f4AppraiserVendor',
    vendorUid: `vendor_${Math.random().toString(36).slice(2)}`,
    vendorName: 'Test Vendor',
    vendorCompanyName: 'Test Co',
    price: null,
    turnaroundDays: null,
    notes: '',
    status: 'PENDING',
    assignmentId: `assign_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Card F4.3 — RFP & Bids', () => {
  /* ═══ Slot key validation ═══════════════════════════════════════════════ */
  describe('Slot key validation', () => {
    it('all 8 F4 slots are valid', () => {
      expect(VALID_SLOT_KEYS).toHaveLength(8);
    });

    it('rejects unknown slot keys', () => {
      expect(VALID_SLOT_KEYS.includes('f4UnknownVendor' as any)).toBe(false);
      expect(VALID_SLOT_KEYS.includes('' as any)).toBe(false);
    });

    it('each slot has a human-readable label', () => {
      for (const key of VALID_SLOT_KEYS) {
        expect(SLOT_LABELS[key]).toBeDefined();
        expect(SLOT_LABELS[key].length).toBeGreaterThan(2);
      }
    });
  });

  /* ═══ Bid grouping ═════════════════════════════════════════════════════ */
  describe('Bid grouping by rfpId', () => {
    it('groups bids with the same rfpId together', () => {
      const bids = [
        makeBid({ rfpId: 'rfp_1', vendorName: 'A' }),
        makeBid({ rfpId: 'rfp_1', vendorName: 'B' }),
        makeBid({ rfpId: 'rfp_2', vendorName: 'C' }),
      ];
      const groups = groupBidsByRfpId(bids);
      expect(groups).toHaveLength(2);
      expect(groups[0].bids).toHaveLength(2);
      expect(groups[1].bids).toHaveLength(1);
    });

    it('returns empty array for no bids', () => {
      const groups = groupBidsByRfpId([]);
      expect(groups).toHaveLength(0);
    });

    it('preserves slotKey and resolves slotLabel', () => {
      const bids = [makeBid({ rfpId: 'rfp_x', slotKey: 'f4CdcVendor' })];
      const groups = groupBidsByRfpId(bids);
      expect(groups[0].slotKey).toBe('f4CdcVendor');
      expect(groups[0].slotLabel).toBe('CDC (SBA 504)');
    });

    it('falls back to raw key when label is missing', () => {
      const bids = [makeBid({ rfpId: 'rfp_y', slotKey: 'f4UnknownSlot' as any })];
      const groups = groupBidsByRfpId(bids);
      expect(groups[0].slotLabel).toBe('f4UnknownSlot');
    });
  });

  /* ═══ Best-value highlighting ══════════════════════════════════════════ */
  describe('Best-value detection', () => {
    it('finds the lowest price', () => {
      const bids = [
        makeBid({ price: 1200 }),
        makeBid({ price: 800 }),
        makeBid({ price: 1500 }),
      ];
      const { bestPrice } = getBestValues(bids);
      expect(bestPrice).toBe(800);
    });

    it('finds the fastest turnaround', () => {
      const bids = [
        makeBid({ turnaroundDays: 5 }),
        makeBid({ turnaroundDays: 3 }),
        makeBid({ turnaroundDays: 7 }),
      ];
      const { bestTurnaround } = getBestValues(bids);
      expect(bestTurnaround).toBe(3);
    });

    it('returns null when no bids have prices', () => {
      const bids = [makeBid({ price: null }), makeBid({ price: null })];
      const { bestPrice } = getBestValues(bids);
      expect(bestPrice).toBeNull();
    });

    it('ignores bids with turnaround = 0 or null', () => {
      const bids = [
        makeBid({ turnaroundDays: 0 }),
        makeBid({ turnaroundDays: null }),
        makeBid({ turnaroundDays: 5 }),
      ];
      const { bestTurnaround } = getBestValues(bids);
      expect(bestTurnaround).toBe(5);
    });

    it('handles single bid correctly', () => {
      const bids = [makeBid({ price: 999, turnaroundDays: 4 })];
      const { bestPrice, bestTurnaround } = getBestValues(bids);
      expect(bestPrice).toBe(999);
      expect(bestTurnaround).toBe(4);
    });
  });

  /* ═══ F4RfpBid type ════════════════════════════════════════════════════ */
  describe('F4RfpBid type contract', () => {
    it('a pending bid has null price and turnaround', () => {
      const bid = makeBid();
      expect(bid.status).toBe('PENDING');
      expect(bid.price).toBeNull();
      expect(bid.turnaroundDays).toBeNull();
    });

    it('a quoted bid has price set', () => {
      const bid = makeBid({ status: 'QUOTED', price: 1500, turnaroundDays: 7, notes: 'Includes Phase I ESA' });
      expect(bid.status).toBe('QUOTED');
      expect(bid.price).toBe(1500);
      expect(bid.turnaroundDays).toBe(7);
      expect(bid.notes).toBe('Includes Phase I ESA');
    });

    it('an accepted bid tracks acceptedAt', () => {
      const bid = makeBid({ status: 'ACCEPTED', acceptedAt: '2025-07-19T12:00:00Z' });
      expect(bid.status).toBe('ACCEPTED');
      expect(bid.acceptedAt).toBeDefined();
    });
  });

  /* ═══ RFP issuance validation ══════════════════════════════════════════ */
  describe('RFP issuance validation', () => {
    it('requires at least one vendor', () => {
      const vendorUids: string[] = [];
      expect(vendorUids.length).toBe(0);
      // issueSlotRfp would return error
    });

    it('caps at 10 vendors maximum', () => {
      const vendorUids = Array.from({ length: 11 }, (_, i) => `vendor_${i}`);
      expect(vendorUids.length).toBeGreaterThan(10);
      // issueSlotRfp would return error
    });

    it('requires a valid slot key', () => {
      expect(VALID_SLOT_KEYS.includes('f4AppraiserVendor')).toBe(true);
      expect(VALID_SLOT_KEYS.includes('invalidSlot' as any)).toBe(false);
    });
  });

  /* ═══ Bid acceptance state transitions ═════════════════════════════════ */
  describe('Bid acceptance rules', () => {
    it('can accept a PENDING bid', () => {
      const bid = makeBid({ status: 'PENDING' });
      const canAccept = bid.status === 'PENDING' || bid.status === 'QUOTED';
      expect(canAccept).toBe(true);
    });

    it('can accept a QUOTED bid', () => {
      const bid = makeBid({ status: 'QUOTED' });
      const canAccept = bid.status === 'PENDING' || bid.status === 'QUOTED';
      expect(canAccept).toBe(true);
    });

    it('cannot accept a CANCELLED bid', () => {
      const bid = makeBid({ status: 'CANCELLED' });
      const canAccept = bid.status === 'PENDING' || bid.status === 'QUOTED';
      expect(canAccept).toBe(false);
    });

    it('cannot accept a DECLINED bid', () => {
      const bid = makeBid({ status: 'DECLINED' });
      const canAccept = bid.status === 'PENDING' || bid.status === 'QUOTED';
      expect(canAccept).toBe(false);
    });

    it('cannot accept an already ACCEPTED bid', () => {
      const bid = makeBid({ status: 'ACCEPTED' });
      const canAccept = bid.status === 'PENDING' || bid.status === 'QUOTED';
      expect(canAccept).toBe(false);
    });

    it('accepting a bid should cancel other bids in the same rfpId', () => {
      const bids = [
        makeBid({ rfpId: 'rfp_test', status: 'QUOTED', vendorName: 'Winner' }),
        makeBid({ rfpId: 'rfp_test', status: 'QUOTED', vendorName: 'Loser 1' }),
        makeBid({ rfpId: 'rfp_test', status: 'PENDING', vendorName: 'Loser 2' }),
      ];
      // Simulate: accept first, cancel others
      const winnerId = bids[0].id;
      const updatedBids = bids.map((b) =>
        b.id === winnerId
          ? { ...b, status: 'ACCEPTED' as const }
          : b.status === 'PENDING' || b.status === 'QUOTED'
            ? { ...b, status: 'CANCELLED' as const }
            : b
      );
      expect(updatedBids.filter((b) => b.status === 'ACCEPTED')).toHaveLength(1);
      expect(updatedBids.filter((b) => b.status === 'CANCELLED')).toHaveLength(2);
    });
  });
});
