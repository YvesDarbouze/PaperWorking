import { NextResponse } from 'next/server';
import { RentCastPropertyAdapter, RequiresCredentialsError } from '@paperworking/api';
import {
  type PropertyComparableSale,
  type UnifiedPropertyLookupResult,
} from './property-types';
import {
  PropertyEstimateCacheRepository,
  normalizePropertyAddress,
  type PropertyEstimateCacheRecord,
  checkDurableRateLimitPostgres,
  ESTIMATE_TTL_MS,
  RENT_ESTIMATE_TTL_MS,
  recordPropertyCacheHit,
  recordPropertyCacheMiss,
} from './property-cache-local';
import { extractClientIp } from '@/lib/security/durable-rate-limiter';
import { rentCastCircuitBreaker } from './rentcast-circuit-breaker';
import offlineDictionary from './offline-property-dictionary.json';

export interface ExecuteLookupOptions {
  forceRefresh?: boolean;
  userId?: string | null;
  organizationId?: string | null;
  clientIp?: string;
  requestHeaders?: { get(name: string): string | null };
  deps?: {
    cacheRepo?: PropertyEstimateCacheRepository;
    adapter?: any;
    db?: any;
    getFirestore?: () => any;
  };
}

export interface EnrichedPropertyLookupResult extends UnifiedPropertyLookupResult {
  source?: 'rentcast' | 'cache' | 'offline';
  as_of?: string;
  asOf?: string;
  stale?: boolean;
  isStale?: boolean;
  degraded?: boolean;
  requiresAuth?: boolean;
  coverageNote?: string;
}

const defaultCacheRepo = new PropertyEstimateCacheRepository();

function findInOfflineDictionary(normalized: string) {
  if (!normalized) return null;
  return (
    offlineDictionary.find((item) => {
      const target = item.normalizedAddress;
      return target === normalized || target.includes(normalized) || normalized.includes(target);
    }) || null
  );
}

/**
 * Shared property lookup service with:
 * - Tiered Dual-Policy (Anonymous: Cache + Offline Dictionary; Authenticated: Live RentCast)
 * - Neon Database Caching (TTL 30d valuation / 7d rent estimates)
 * - Postgres-backed durable per-org, per-user, and per-IP rate limits with Retry-After
 * - Cache hit rate tracking surfaced in /api/health (counts only)
 * - Circuit Breaker & Outage Degradation ("Estimates temporarily unavailable — enter manually")
 * - Staleness honesty: visible "as of {date}" badge for figures older than TTL
 * - Honest Rule 5 reporting
 */
export async function executePropertyLookup(
  address: string | null | undefined,
  options: ExecuteLookupOptions = {},
): Promise<NextResponse> {
  if (!address || !address.trim()) {
    return NextResponse.json(
      { error: 'Property address is required for property data lookup' },
      { status: 400 },
    );
  }

  const cleanAddress = address.trim();
  const normalized = normalizePropertyAddress(cleanAddress);
  const cacheRepo = options.deps?.cacheRepo || defaultCacheRepo;
  const ip = options.clientIp || (options.requestHeaders ? extractClientIp(options.requestHeaders) : '127.0.0.1');
  const userId = options.userId ?? null;
  const organizationId = options.organizationId ?? null;
  const forceRefresh = Boolean(options.forceRefresh);
  const rateLimitDeps = options.deps?.db ? { db: options.deps.db } : {};

  // 1. Postgres-Backed Durable Rate Limiting Check
  if (userId) {
    // Authenticated User Limit: 30 req/10min per user
    const userLimit = await checkDurableRateLimitPostgres(
      { key: `rentcast:user:${userId}`, limit: 30, windowSeconds: 600 },
      rateLimitDeps,
    );
    if (!userLimit.allowed) {
      const retryAfter = userLimit.retryAfter || 60;
      return NextResponse.json(
        {
          error: 'User rate limit exceeded for property valuation lookups. Please wait before retrying.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        },
      );
    }

    // Organization Limit (if user has active organization): 60 req/10min per org
    if (organizationId) {
      const orgLimit = await checkDurableRateLimitPostgres(
        { key: `rentcast:org:${organizationId}`, limit: 60, windowSeconds: 600 },
        rateLimitDeps,
      );
      if (!orgLimit.allowed) {
        const retryAfter = orgLimit.retryAfter || 60;
        return NextResponse.json(
          {
            error: 'Organization rate limit exceeded for property valuation lookups. Please wait before retrying.',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
            },
          },
        );
      }
    }

    // Authenticated IP Limit: 60 req/10min per IP
    const ipLimit = await checkDurableRateLimitPostgres(
      { key: `rentcast:auth:ip:${ip}`, limit: 60, windowSeconds: 600 },
      rateLimitDeps,
    );
    if (!ipLimit.allowed) {
      const retryAfter = ipLimit.retryAfter || 60;
      return NextResponse.json(
        {
          error: 'IP rate limit exceeded for property valuation lookups. Please wait before retrying.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        },
      );
    }
  } else {
    // Anonymous: 15 req/10min per IP (cache/offline only)
    const anonLimit = await checkDurableRateLimitPostgres(
      { key: `rentcast:anon:ip:${ip}`, limit: 15, windowSeconds: 600 },
      rateLimitDeps,
    );
    if (!anonLimit.allowed) {
      const retryAfter = anonLimit.retryAfter || 60;
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait a few minutes before trying again.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        },
      );
    }
  }

  // 2. Check Neon Estimate Cache (30d valuation TTL / 7d rent estimate TTL)
  let cached: PropertyEstimateCacheRecord | null = null;
  try {
    cached = await cacheRepo.get(normalized);
  } catch {
    // Cache read failure is non-fatal
  }

  const now = Date.now();
  const isValuationFresh = Boolean(cached && cached.estimatesExpireAt && cached.estimatesExpireAt.getTime() > now);
  const rentExpiresTime = cached?.rentExpiresAt
    ? cached.rentExpiresAt.getTime()
    : cached?.asOf
    ? cached.asOf.getTime() + RENT_ESTIMATE_TTL_MS
    : 0;
  const isRentFresh = Boolean(cached && rentExpiresTime > now);
  const isCompsFresh = Boolean(cached && cached.compsExpireAt && cached.compsExpireAt.getTime() > now);
  const isFullyFresh = isValuationFresh && isRentFresh;

  // Cache hit path (unless forceRefresh is requested by authenticated user)
  if (cached && isFullyFresh && (!forceRefresh || !userId)) {
    recordPropertyCacheHit();
    const rawCachedComps = Array.isArray(cached.comps) ? cached.comps : [];
    const mappedComps: PropertyComparableSale[] = rawCachedComps.map((c: any) => ({
      address: c.address,
      sale_price: c.sale_price,
      sale_date: c.sale_date,
      sqft: c.sqft,
      distance: c.distance,
      source: c.source || 'cache',
      asOf: c.asOf || c.sale_date || cached!.asOf.toISOString().slice(0, 10),
      isStale: !isCompsFresh,
    }));
    const enriched: EnrichedPropertyLookupResult = {
      provider: cached.provider,
      configured: true,
      source: 'cache',
      as_of: cached.asOf.toISOString(),
      asOf: cached.asOf.toISOString(),
      stale: false,
      isStale: false,
      facts: cached.facts,
      estimatedValue: cached.estimatedValue ?? undefined,
      valueRangeLow: cached.valueRangeLow ?? undefined,
      valueRangeHigh: cached.valueRangeHigh ?? undefined,
      estimatedRent: cached.estimatedRent ?? undefined,
      rentRangeLow: cached.rentRangeLow ?? undefined,
      rentRangeHigh: cached.rentRangeHigh ?? undefined,
      comps: mappedComps,
      requiresCredentials: false,
    };
    return NextResponse.json(enriched);
  }

  // 3. Unauthenticated/Anonymous Caller Gate: Never hit live RentCast!
  if (!userId) {
    const offlineItem = findInOfflineDictionary(normalized);
    if (offlineItem) {
      const mappedComps: PropertyComparableSale[] = (offlineItem.comps || []).map((c: any) => ({
        address: c.address,
        sale_price: c.sale_price,
        sale_date: c.sale_date,
        sqft: c.sqft,
        distance: c.distance,
        source: c.source || 'offline-benchmark',
        asOf: c.asOf || c.sale_date || offlineItem.asOf.slice(0, 10),
        isStale: false,
      }));
      const offlineResult: EnrichedPropertyLookupResult = {
        provider: 'offline-benchmark',
        configured: true,
        source: 'offline',
        as_of: offlineItem.asOf,
        asOf: offlineItem.asOf,
        stale: false,
        isStale: false,
        facts: offlineItem.facts as any,
        estimatedValue: offlineItem.estimatedValue,
        valueRangeLow: offlineItem.valueRangeLow,
        valueRangeHigh: offlineItem.valueRangeHigh,
        estimatedRent: offlineItem.estimatedRent,
        rentRangeLow: offlineItem.rentRangeLow,
        rentRangeHigh: offlineItem.rentRangeHigh,
        comps: mappedComps,
        coverageNote:
          'Offline Benchmark Data (Austin, Phoenix, Dallas, Denver) — Authenticate for live RentCast valuation on any US address.',
        requiresCredentials: false,
      };
      return NextResponse.json(offlineResult);
    }

    // Stale cached record fallback for anonymous caller
    if (cached) {
      const rawCachedComps = Array.isArray(cached.comps) ? cached.comps : [];
      const mappedComps: PropertyComparableSale[] = rawCachedComps.map((c: any) => ({
        address: c.address,
        sale_price: c.sale_price,
        sale_date: c.sale_date,
        sqft: c.sqft,
        distance: c.distance,
        source: c.source || 'cache',
        asOf: c.asOf || c.sale_date || cached!.asOf.toISOString().slice(0, 10),
        isStale: true,
      }));
      return NextResponse.json({
        provider: cached.provider,
        configured: true,
        source: 'cache',
        as_of: cached.asOf.toISOString(),
        asOf: cached.asOf.toISOString(),
        stale: true,
        isStale: true,
        facts: cached.facts,
        estimatedValue: cached.estimatedValue ?? undefined,
        valueRangeLow: cached.valueRangeLow ?? undefined,
        valueRangeHigh: cached.valueRangeHigh ?? undefined,
        estimatedRent: cached.estimatedRent ?? undefined,
        rentRangeLow: cached.rentRangeLow ?? undefined,
        rentRangeHigh: cached.rentRangeHigh ?? undefined,
        comps: mappedComps,
        message: 'Showing cached valuation. Sign in to run a live refresh.',
        requiresCredentials: false,
      } as EnrichedPropertyLookupResult);
    }

    // Check credentials first if address is not in offline dictionary
    const apiKey = process.env.RENTCAST_API_KEY || process.env.ATTOM_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({
        provider: 'rentcast',
        configured: false,
        requiresCredentials: true,
        message: 'Property data provider (RentCast) is not configured — no comp data — REQUIRES CREDENTIALS',
        facts: null,
        comps: [] as PropertyComparableSale[],
      } as EnrichedPropertyLookupResult);
    }

    // Unauthenticated and not in offline dictionary
    return NextResponse.json({
      provider: 'rentcast',
      configured: true,
      source: 'offline',
      requiresAuth: true,
      message:
        'Live property lookup requires authentication. Sign in to evaluate any US property, or test with our benchmark cities (Austin, Phoenix, Dallas, Denver).',
      facts: null,
      comps: [] as PropertyComparableSale[],
    } as EnrichedPropertyLookupResult);
  }

  // 4. Authenticated Caller -> Check Circuit Breaker
  if (!rentCastCircuitBreaker.isAvailable()) {
    if (cached) {
      const rawCachedComps = Array.isArray(cached.comps) ? cached.comps : [];
      const mappedComps: PropertyComparableSale[] = rawCachedComps.map((c: any) => ({
        address: c.address,
        sale_price: c.sale_price,
        sale_date: c.sale_date,
        sqft: c.sqft,
        distance: c.distance,
        source: c.source || 'cache',
        asOf: c.asOf || c.sale_date || cached!.asOf.toISOString().slice(0, 10),
        isStale: true,
      }));
      return NextResponse.json({
        provider: cached.provider,
        configured: true,
        source: 'cache',
        as_of: cached.asOf.toISOString(),
        asOf: cached.asOf.toISOString(),
        stale: true,
        isStale: true,
        degraded: true,
        facts: cached.facts,
        estimatedValue: cached.estimatedValue ?? undefined,
        valueRangeLow: cached.valueRangeLow ?? undefined,
        valueRangeHigh: cached.valueRangeHigh ?? undefined,
        estimatedRent: cached.estimatedRent ?? undefined,
        rentRangeLow: cached.rentRangeLow ?? undefined,
        rentRangeHigh: cached.rentRangeHigh ?? undefined,
        comps: mappedComps,
        message: 'RentCast provider experiencing temporary outage — showing cached data.',
        requiresCredentials: false,
      } as EnrichedPropertyLookupResult);
    }

    return NextResponse.json({
      provider: 'rentcast',
      configured: true,
      degraded: true,
      message: 'Estimates temporarily unavailable — enter manually.',
      facts: null,
      comps: [] as PropertyComparableSale[],
    } as EnrichedPropertyLookupResult);
  }

  // 5. Check API Credentials (Rule 5 honest reporting)
  const apiKey = process.env.RENTCAST_API_KEY || process.env.ATTOM_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({
      provider: 'rentcast',
      configured: false,
      requiresCredentials: true,
      message: 'Property data provider (RentCast) is not configured — no comp data — REQUIRES CREDENTIALS',
      facts: null,
      comps: [] as PropertyComparableSale[],
    } as EnrichedPropertyLookupResult);
  }

  // 6. Execute Live RentCast Call
  try {
    recordPropertyCacheMiss();
    rentCastCircuitBreaker.recordCall();
    const adapter = options.deps?.adapter || new RentCastPropertyAdapter({ apiKey });
    const unified: UnifiedPropertyLookupResult = await adapter.fetchUnifiedPropertyData(cleanAddress);

    rentCastCircuitBreaker.recordSuccess();

    // Persist to Neon PropertyEstimateCache with 30d valuation / 7d rent TTLs
    const now = new Date();
    const saved = await cacheRepo.set({
      rawAddress: cleanAddress,
      facts: unified.facts,
      estimatedValue: unified.estimatedValue ?? null,
      valueRangeLow: unified.valueRangeLow ?? null,
      valueRangeHigh: unified.valueRangeHigh ?? null,
      estimatedRent: unified.estimatedRent ?? null,
      rentRangeLow: unified.rentRangeLow ?? null,
      rentRangeHigh: unified.rentRangeHigh ?? null,
      comps: unified.comps || [],
      provider: unified.provider || 'rentcast',
      asOf: now,
      estimatesExpireAt: new Date(now.getTime() + ESTIMATE_TTL_MS),
      rentExpiresAt: new Date(now.getTime() + RENT_ESTIMATE_TTL_MS),
    });

    const mappedLiveComps: PropertyComparableSale[] = (unified.comps || []).map((c: any) => ({
      address: c.address,
      sale_price: c.sale_price,
      sale_date: c.sale_date,
      sqft: c.sqft,
      distance: c.distance,
      source: c.source || 'rentcast',
      asOf: c.asOf || c.sale_date || now.toISOString().slice(0, 10),
      isStale: false,
    }));

    const result: EnrichedPropertyLookupResult = {
      ...unified,
      source: 'rentcast',
      as_of: saved.asOf.toISOString(),
      asOf: saved.asOf.toISOString(),
      stale: false,
      isStale: false,
      comps: mappedLiveComps,
      message: mappedLiveComps.length === 0 ? 'no recent comps found' : undefined,
    };
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequiresCredentialsError) {
      return NextResponse.json({
        provider: 'rentcast',
        configured: false,
        requiresCredentials: true,
        message: 'Property data provider (RentCast) is not configured — no comp data — REQUIRES CREDENTIALS',
        facts: null,
        comps: [] as PropertyComparableSale[],
      } as EnrichedPropertyLookupResult);
    }

    rentCastCircuitBreaker.recordFailure();

    // If we have any cached data, serve stale cached version instead of crashing
    if (cached) {
      const rawCachedComps = Array.isArray(cached.comps) ? cached.comps : [];
      const mappedComps: PropertyComparableSale[] = rawCachedComps.map((c: any) => ({
        address: c.address,
        sale_price: c.sale_price,
        sale_date: c.sale_date,
        sqft: c.sqft,
        distance: c.distance,
        source: c.source || 'cache',
        asOf: c.asOf || c.sale_date || cached!.asOf.toISOString().slice(0, 10),
        isStale: true,
      }));
      return NextResponse.json({
        provider: cached.provider,
        configured: true,
        source: 'cache',
        as_of: cached.asOf.toISOString(),
        asOf: cached.asOf.toISOString(),
        stale: true,
        isStale: true,
        degraded: true,
        facts: cached.facts,
        estimatedValue: cached.estimatedValue ?? undefined,
        valueRangeLow: cached.valueRangeLow ?? undefined,
        valueRangeHigh: cached.valueRangeHigh ?? undefined,
        estimatedRent: cached.estimatedRent ?? undefined,
        rentRangeLow: cached.rentRangeLow ?? undefined,
        rentRangeHigh: cached.rentRangeHigh ?? undefined,
        comps: mappedComps,
        message: 'Estimates temporarily unavailable — enter manually.',
        requiresCredentials: false,
      } as EnrichedPropertyLookupResult);
    }

    const message = error instanceof Error ? error.message : 'Property lookup failed';
    console.warn('[RentCast Lookup Outage/Failure]:', message);

    // Degrade gracefully with outage message, NEVER null-into-math
    return NextResponse.json(
      {
        provider: 'rentcast',
        configured: true,
        degraded: true,
        message: 'Estimates temporarily unavailable — enter manually.',
        facts: null,
        comps: [] as PropertyComparableSale[],
      } as EnrichedPropertyLookupResult,
      { status: 200 },
    );
  }
}
