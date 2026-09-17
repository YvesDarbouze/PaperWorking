export const ESTIMATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RENT_ESTIMATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizePropertyAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]/g, '');
}

export interface PropertyEstimateCacheRecord {
  rawAddress: string;
  facts: Record<string, unknown> | null;
  estimatedValue: number | null;
  valueRangeLow: number | null;
  valueRangeHigh: number | null;
  estimatedRent: number | null;
  rentRangeLow: number | null;
  rentRangeHigh: number | null;
  comps: unknown[];
  provider: string;
  asOf: Date;
  estimatesExpireAt: Date | null;
  rentExpiresAt: Date | null;
  compsExpireAt?: Date | null;
}

const cacheStore = new Map<string, PropertyEstimateCacheRecord>();

export class PropertyEstimateCacheRepository {
  async get(normalizedAddress: string): Promise<PropertyEstimateCacheRecord | null> {
    return cacheStore.get(normalizePropertyAddress(normalizedAddress)) ?? null;
  }

  async set(record: PropertyEstimateCacheRecord): Promise<PropertyEstimateCacheRecord> {
    cacheStore.set(normalizePropertyAddress(record.rawAddress), record);
    return record;
  }
}

const rateLimitStore = new Map<string, number[]>();

export async function checkDurableRateLimitPostgres(
  spec: { key: string; limit: number; windowSeconds: number },
  _deps: Record<string, unknown> = {},
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const windowMs = spec.windowSeconds * 1000;
  const hits = (rateLimitStore.get(spec.key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= spec.limit) {
    const oldest = hits[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitStore.set(spec.key, hits);
    return { allowed: false, retryAfter };
  }

  hits.push(now);
  rateLimitStore.set(spec.key, hits);
  return { allowed: true };
}

let cacheHitCount = 0;
let cacheMissCount = 0;

export function recordPropertyCacheHit(): void {
  cacheHitCount += 1;
}

export function recordPropertyCacheMiss(): void {
  cacheMissCount += 1;
}
