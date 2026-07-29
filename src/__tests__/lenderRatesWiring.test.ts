/**
 * Prompt 27W — Lender Rates: wire the page to the rates source that already exists.
 *
 * Regression tests verifying:
 *   1. Hardcoded rate literals (6.125, 6.450, NEO, Legacy Bank) are not in the page component
 *   2. DEFAULT_RATES is not used as initial state in the page
 *   3. parseRatesDoc returns [] (not DEFAULT_RATES) when the doc has no rates
 *   4. FirestoreRateAdapter returns [] (not DEFAULT_RATES) when Firestore is unreachable
 *   5. The page has loading / empty / populated states
 *   6. DEFAULT_RATES import is gone from the page
 *   7. Admin path still intact: PUT route + LenderRatesAdmin component
 *   8. As-of date row is present in the comparison table (real timestamp)
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const PAGE = read('app/dashboard/projects/[id]/phase-2/page.tsx');
const PROVIDER = read('lib/providers/lenderRates.ts');
const ADMIN_ROUTE = read('app/api/admin/lender-rates/route.ts');
const ADMIN_COMPONENT = read('components/phase2/LenderRatesAdmin.tsx');

describe('Prompt 27W — Lender Rates: wired to existing source', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Page must not contain hardcoded rate literals
  // ─────────────────────────────────────────────────────────────────────────
  describe('page: no hardcoded rate literals', () => {
    it('does not contain "6.125" rate literal', () => {
      expect(PAGE).not.toContain('6.125');
    });

    it('does not contain "6.450" rate literal', () => {
      expect(PAGE).not.toContain('6.450');
    });

    it('does not contain "6.45" rate literal', () => {
      expect(PAGE).not.toContain('6.45');
    });

    it('does not contain literal string NEO Capital (lender name)', () => {
      expect(PAGE).not.toContain("'NEO Capital'");
      expect(PAGE).not.toContain('"NEO Capital"');
    });

    it('does not contain literal string Legacy Bank (lender name)', () => {
      expect(PAGE).not.toContain("'Legacy Bank'");
      expect(PAGE).not.toContain('"Legacy Bank"');
    });

    it('does not import DEFAULT_RATES from lenderRates', () => {
      expect(PAGE).not.toMatch(/import\s*\{[^}]*DEFAULT_RATES[^}]*\}/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Page initial state must be null (loading sentinel), not DEFAULT_RATES
  // ─────────────────────────────────────────────────────────────────────────
  describe('page: initial state is null not DEFAULT_RATES', () => {
    it('initializes lenderRates as null', () => {
      expect(PAGE).toMatch(/useState\s*<\s*LenderRate\[\]\s*\|\s*null\s*>\s*\(\s*null\s*\)/);
    });

    it('does not use DEFAULT_RATES as initial useState value', () => {
      expect(PAGE).not.toMatch(/useState\s*<[^>]+>\s*\(\s*DEFAULT_RATES\s*\)/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Page snapshot handler must not fall back to DEFAULT_RATES
  // ─────────────────────────────────────────────────────────────────────────
  describe('page: snapshot handler does not use DEFAULT_RATES', () => {
    it('does not call setLenderRates(DEFAULT_RATES) in the snapshot handler', () => {
      expect(PAGE).not.toContain('setLenderRates(DEFAULT_RATES)');
    });

    it('snapshot handler sets empty array when doc is absent', () => {
      expect(PAGE).toMatch(/setLenderRates\s*\(\s*\[\s*\]\s*\)/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Page has three honest states: loading, empty, populated
  // ─────────────────────────────────────────────────────────────────────────
  describe('page: three-state rendering', () => {
    it('renders a loading state when lenderRates is null', () => {
      expect(PAGE).toContain('lenderRates === null');
    });

    it('renders an empty/not-configured state when lenderRates is empty', () => {
      expect(PAGE).toContain('lenderRates.length === 0');
    });

    it('renders the populated state only when rates length > 0', () => {
      expect(PAGE).toContain('lenderRates.length > 0');
    });

    it('shows a not-configured message in the empty state', () => {
      const hasMessage =
        PAGE.includes('not configured') ||
        PAGE.includes('Rates have not been configured') ||
        PAGE.includes('Lender rates not configured');
      expect(hasMessage).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Page still uses onSnapshot and shows real as-of date
  // ─────────────────────────────────────────────────────────────────────────
  describe('page: real-time Firestore subscription with real timestamps', () => {
    it('uses onSnapshot to subscribe to systemConfig/lenderRates', () => {
      expect(PAGE).toContain('onSnapshot');
      expect(PAGE).toContain('systemConfig');
    });

    it('the as-of date row is present in the comparison table', () => {
      expect(PAGE).toContain('Rates as of');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Provider: parseRatesDoc returns [] for absent/empty data
  // ─────────────────────────────────────────────────────────────────────────
  describe('provider: parseRatesDoc returns [] not DEFAULT_RATES for empty docs', () => {
    it('parseRatesDoc returns [] when rates array is absent', () => {
      const { parseRatesDoc } = require('../lib/providers/lenderRates');
      const result = parseRatesDoc({});
      expect(result).toEqual([]);
    });

    it('parseRatesDoc returns [] when rates is an empty array', () => {
      const { parseRatesDoc } = require('../lib/providers/lenderRates');
      const result = parseRatesDoc({ rates: [] });
      expect(result).toEqual([]);
    });

    it('parseRatesDoc still parses real rates correctly', () => {
      const { parseRatesDoc } = require('../lib/providers/lenderRates');
      const result = parseRatesDoc({
        rates: [{
          id: 'TEST', name: 'Test Lender', interestRate: 7.25, points: 1.0,
          lenderFeesCents: 100000, asOf: { toDate: () => new Date('2026-06-01') },
        }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('TEST');
      expect(result[0].interestRate).toBe(7.25);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Provider: FirestoreRateAdapter returns [] not DEFAULT_RATES on error
  // ─────────────────────────────────────────────────────────────────────────
  describe('provider: FirestoreRateAdapter returns [] not DEFAULT_RATES', () => {
    it('getRates() returns [] when db is null/missing', async () => {
      const { FirestoreRateAdapter } = require('../lib/providers/lenderRates');
      const adapter = new FirestoreRateAdapter(null);
      const result = await adapter.getRates();
      expect(result).toEqual([]);
    });

    it('provider catch block does not return DEFAULT_RATES', () => {
      expect(PROVIDER).not.toMatch(/catch[\s\S]{0,200}return DEFAULT_RATES/);
    });

    it('FirestoreRateAdapter !snap.exists path does not return DEFAULT_RATES', () => {
      expect(PROVIDER).not.toMatch(/!snap\.exists[\s\S]{0,300}DEFAULT_RATES/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Admin path is still intact
  // ─────────────────────────────────────────────────────────────────────────
  describe('admin path: PUT route + LenderRatesAdmin component', () => {
    it('PUT route has requireAuth guard', () => {
      expect(ADMIN_ROUTE).toContain('export async function PUT');
      expect(ADMIN_ROUTE).toContain('requireAuth');
    });

    it('PUT route checks for Lead Investor / Admin orgRole', () => {
      expect(ADMIN_ROUTE).toContain('Lead Investor');
    });

    it('LenderRatesAdmin calls PUT /api/admin/lender-rates', () => {
      expect(ADMIN_COMPONENT).toContain('/api/admin/lender-rates');
      expect(ADMIN_COMPONENT).toContain("'PUT'");
    });

    it('LenderRatesAdmin sends Firebase ID token', () => {
      expect(ADMIN_COMPONENT).toContain('getIdToken');
      expect(ADMIN_COMPONENT).toContain('Authorization');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. DEFAULT_RATES constant still exists for HardcodedFallbackAdapter
  // ─────────────────────────────────────────────────────────────────────────
  describe('DEFAULT_RATES: still exported for explicit opt-in only', () => {
    it('DEFAULT_RATES is still exported from the provider', () => {
      expect(PROVIDER).toContain('export const DEFAULT_RATES');
    });

    it('HardcodedFallbackAdapter still returns DEFAULT_RATES when explicitly selected', () => {
      const { HardcodedFallbackAdapter, DEFAULT_RATES } = require('../lib/providers/lenderRates');
      const adapter = new HardcodedFallbackAdapter();
      return adapter.getRates().then((rates: unknown[]) => {
        expect(rates).toEqual(DEFAULT_RATES);
      });
    });
  });
});
