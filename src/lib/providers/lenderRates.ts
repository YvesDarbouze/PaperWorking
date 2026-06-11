/* ═══════════════════════════════════════════════════════════════
   LenderRateProvider — vendor-agnostic rate abstraction

   Active adapter is selected via LENDER_RATE_PROVIDER env var:
     firestore  (default) — admin-editable Firestore doc
     hardcoded            — static fallback, never asOf-fresh
     zillow               — stubbed partner API adapter (not-yet-enabled)

   The FirestoreRateAdapter is the always-available production
   path. The HardcodedFallbackAdapter is used when Firestore
   is unreachable or the doc does not yet exist.
   ═══════════════════════════════════════════════════════════════ */

export interface LenderRate {
  id: string;
  name: string;
  /** Annual interest rate as a percentage, e.g. 6.125 */
  interestRate: number;
  /** Origination points, e.g. 1.0 */
  points: number;
  /** Lender flat fees in cents */
  lenderFeesCents: number;
  /** When this rate was last explicitly set by an admin */
  asOf: Date;
}

export interface LenderRateProvider {
  getRates(): Promise<LenderRate[]>;
}

/** Number of days before a rate is considered stale */
export const STALE_THRESHOLD_DAYS = 30;

export function isRateStale(asOf: Date): boolean {
  const ageMs = Date.now() - asOf.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > STALE_THRESHOLD_DAYS;
}

/**
 * Default rates — only used as the HardcodedFallback or as seed
 * values when the Firestore doc is absent.
 *
 * asOf is epoch-zero so the stale indicator always fires for these,
 * reminding admins to set real values.
 */
export const DEFAULT_RATES: LenderRate[] = [
  {
    id:              'NEO',
    name:            'NEO Capital',
    interestRate:    6.125,
    points:          1.0,
    lenderFeesCents: 125000,
    asOf:            new Date(0),
  },
  {
    id:              'LEGACY',
    name:            'Legacy Bank',
    interestRate:    6.450,
    points:          1.5,
    lenderFeesCents: 150000,
    asOf:            new Date(0),
  },
];

/**
 * Always-available fallback: returns DEFAULT_RATES with epoch-zero
 * asOf so stale indicators fire. Never used in production unless
 * Firestore is unreachable.
 */
export class HardcodedFallbackAdapter implements LenderRateProvider {
  async getRates(): Promise<LenderRate[]> {
    return DEFAULT_RATES;
  }
}

/**
 * FirestoreRateAdapter — pulls rates dynamically from Firestore.
 * This is the primary production source for admin-defined rates.
 */
export class FirestoreRateAdapter implements LenderRateProvider {
  private db: any;

  constructor(customDb?: any) {
    this.db = customDb;
  }

  private async getDb() {
    if (this.db) return this.db;
    try {
      const { adminDb } = require('@/lib/firebase/admin');
      return adminDb;
    } catch {
      return null;
    }
  }

  async getRates(): Promise<LenderRate[]> {
    try {
      const dbInstance = await this.getDb();
      if (!dbInstance) {
        return DEFAULT_RATES;
      }
      const snap = await dbInstance.collection('systemConfig').doc('lenderRates').get();
      if (!snap.exists) {
        return DEFAULT_RATES;
      }
      return parseRatesDoc(snap.data()!);
    } catch (err) {
      console.warn('[FirestoreRateAdapter] Failed to get rates, falling back:', err);
      return DEFAULT_RATES;
    }
  }
}

/**
 * ZillowRatesAdapter — Stubbed rates adapter.
 * Marked as disabled/not-yet-enabled until Zillow Mortgage Partner access is approved.
 */
export class ZillowRatesAdapter implements LenderRateProvider {
  private readonly apiKey?: string;
  public readonly isEnabled: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.isEnabled = false; // Closed API, needs partner approval
  }

  async getRates(): Promise<LenderRate[]> {
    // Stub implementation: maps Zillow Rates API to our generic LenderRate interface.
    // Once partner access is approved, this will perform a secure server-to-server fetch.
    throw new Error(
      "Zillow Get Current Rates API integration is not yet enabled. " +
      "Requires Zillow Mortgage Rate Cloud API partner approval."
    );
  }
}

/**
 * Parses the raw Firestore document into typed LenderRate[].
 * Exported for server-side API routes and unit tests.
 */
export function parseRatesDoc(data: Record<string, any>): LenderRate[] {
  const raw: any[] = data.rates ?? [];
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_RATES;
  return raw.map((r) => ({
    id:              String(r.id ?? ''),
    name:            String(r.name ?? ''),
    interestRate:    Number(r.interestRate ?? 0),
    points:          Number(r.points ?? 0),
    lenderFeesCents: Number(r.lenderFeesCents ?? 0),
    asOf:            r.asOf?.toDate?.() ?? (r.asOf ? new Date(r.asOf) : new Date(0)),
  }));
}

/**
 * Factory switcher for LenderRateProvider.
 * Defaults to FirestoreRateAdapter, keeping the admin-editable source as primary.
 */
export function getLenderRateProvider(type?: string): LenderRateProvider {
  const providerType = (type || process.env.LENDER_RATE_PROVIDER || "firestore").toLowerCase();

  switch (providerType) {
    case "zillow":
      return new ZillowRatesAdapter(process.env.ZILLOW_API_KEY);
    case "hardcoded":
      return new HardcodedFallbackAdapter();
    case "firestore":
    default:
      return new FirestoreRateAdapter();
  }
}

export const defaultLenderRateProvider = getLenderRateProvider();
