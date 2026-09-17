import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { GET as getSnapshots, POST as postSnapshot } from '../../app/api/calculator/snapshots/route';
import { GET as getLookup, POST as postLookup } from '../../app/api/properties/lookup/route';
import { getCalculatorSnapshots } from '../../lib/calculator/snapshots-store';

describe('Calculator Snapshots & Property Lookup APIs', () => {
  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'user-calc-test';
    process.env.ALLOW_DISK_FALLBACK = 'true';
  });
  describe('1. Property Lookup API (/api/properties/lookup)', () => {
    it('returns honest unconfigured state (Rule 5) when RENTCAST_API_KEY is not set', async () => {
      delete process.env.RENTCAST_API_KEY;
      delete process.env.ATTOM_API_KEY;

      const req = new Request('http://localhost:3000/api/properties/lookup?address=1247+Elm+St');
      const res = await getLookup(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.configured).toBe(false);
      expect(json.requiresCredentials).toBe(true);
      expect(json.provider).toBe('rentcast');
      expect(json.comps).toEqual([]);
      expect(json.facts).toBeNull();
      expect(json.message).toContain('not configured');
    });

    it('returns 400 when address is omitted', async () => {
      const req = new Request('http://localhost:3000/api/properties/lookup');
      const res = await getLookup(req);
      expect(res.status).toBe(400);
    });
  });

  describe('2. Calculator Snapshots API (/api/calculator/snapshots)', () => {
    it('persists a snapshot with inputs, outputs, assumptions, and returns status 201', async () => {
      const payload = {
        inputs: {
          address: '1247 Elm Street, Austin, TX 78702',
          purchasePrice: 485000,
          arv: 620000,
          rehabBudget: 68000,
          grossRentMonthly: 4200,
        },
        outputs: {
          totalCostBasis: 562700,
          capRateOnCost: 5.4,
          cashOnCashReturnPct: 1.3,
          projectedIrrPct: 18.2,
          dscr: 1.10,
        },
        assumptions: {
          holdYears: 5,
          exitCapRate: 6.5,
        },
      };

      const req = new Request('http://localhost:3000/api/calculator/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await postSnapshot(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.snapshot).toBeDefined();
      expect(json.snapshot.id).toMatch(/^snap-/);
      expect(json.snapshot.version).toBeGreaterThanOrEqual(1);
      expect(json.snapshot.engineVersion).toBe(4);
      expect(json.snapshot.superseded).toBe(false);
      expect(json.snapshot.inputs.purchasePrice).toBe(485000);
      expect(json.snapshot.outputs.capRateOnCost).toBe(5.4);
      expect(json.snapshot.createdAt).toBeDefined();

      // Verify retrieval via GET
      const getReq = new Request('http://localhost:3000/api/calculator/snapshots');
      const getRes = await getSnapshots(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.snapshots.length).toBeGreaterThanOrEqual(1);
      expect(getJson.snapshots[0].id).toBe(json.snapshot.id);
    });

    it('rejects incomplete snapshot payload missing inputs or outputs with 400', async () => {
      const req = new Request('http://localhost:3000/api/calculator/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: {} }),
      });

      const res = await postSnapshot(req);
      expect(res.status).toBe(400);
    });
  });
});
