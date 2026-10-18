/**
 * Authoritative Server-side Deals Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for Marketplace Deals
 * under the `deals/{dealId}` collection, with automatic fallback and seed bootstrapping
 * for offline and testing environments.
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import type { RawDeal } from '@/lib/marketplace/seed-data';
import {
  SEED_RAW_DEALS,
  addSeedDeal,
  findSeedDeal,
  findSeedDealBySlug,
} from '@/lib/marketplace/seed-data';
import { sanitizeDealImageUrl } from '@/lib/properties/property-image-helper';

// Server-side in-memory cache keyed across hot-reloads via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __pw_deals_cache: Map<string, RawDeal> | undefined;
}

const memoryDealsCache: Map<string, RawDeal> =
  globalThis.__pw_deals_cache ?? (globalThis.__pw_deals_cache = new Map<string, RawDeal>());

// Initialize memory cache from seed if empty
if (memoryDealsCache.size === 0) {
  for (const d of SEED_RAW_DEALS) {
    memoryDealsCache.set(d.id, d);
    if (d.slug) memoryDealsCache.set(d.slug, d);
  }
}

/**
 * Recursively strips keys with `undefined` values from plain objects and converts
 * `undefined` array elements to `null`, while preserving Firestore sentinel objects
 * (such as `FieldValue.serverTimestamp()`) and `Date` instances.
 */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : stripUndefinedDeep(item))) as unknown as T;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    return value;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) {
      cleaned[k] = stripUndefinedDeep(v);
    }
  }
  return cleaned as T;
}

/**
 * Normalizes a raw Firestore or seed document to a complete RawDeal.
 */
function normalizeDeal(docId: string, data: Record<string, unknown>): RawDeal {
  const cleanedData = stripUndefinedDeep(data);
  const purchasePrice = Number(cleanedData.purchasePrice ?? 485000);
  const rehabCost = Number(cleanedData.rehabCost ?? 65000);
  const fundingTarget = Number(
    cleanedData.fundingTarget ?? cleanedData.target ?? Math.round(purchasePrice * 0.3 + rehabCost),
  );

  const projectsList = Array.isArray(cleanedData.projects)
    ? (cleanedData.projects as Array<Record<string, unknown>>)
    : [];
  const firstProject = projectsList[0];
  const inferredAssetClass =
    ((cleanedData.assetClass as string) || (firstProject?.propertyType as string)) || undefined;
  const inferredStrategy =
    ((cleanedData.strategy as string) ||
      (cleanedData.subStrategy as string) ||
      (firstProject?.subStrategy as string)) ||
    undefined;

  const shareTokenValue =
    typeof cleanedData.shareToken === 'string' && cleanedData.shareToken.trim().length > 0
      ? cleanedData.shareToken.trim()
      : undefined;

  const base: RawDeal = {
    id: docId,
    slug: (cleanedData.slug as string) || docId,
    address: (cleanedData.address as string) || 'Austin, TX',
    status: (cleanedData.status as string) || 'published',
    visibility: (cleanedData.visibility as any) || 'marketplace',
    sharedWith: (cleanedData.sharedWith as string[]) || [],
    ...(shareTokenValue ? { shareToken: shareTokenValue } : {}),
    purchasePrice,
    rehabCost,
    arv: cleanedData.arv !== undefined && cleanedData.arv !== null ? Number(cleanedData.arv) : null,
    holdingCosts: Number(cleanedData.holdingCosts ?? 12500),
    projectedRoi: Number(cleanedData.projectedRoi ?? cleanedData.targetIrr ?? 15.0),
    targetIrr: Number(cleanedData.targetIrr ?? cleanedData.projectedRoi ?? 15.0),
    equityMultiple: Number(cleanedData.equityMultiple ?? 1.75),
    holdPeriod: (cleanedData.holdPeriod as string) || '3–5 Years',
    minInvestment: Number(cleanedData.minInvestment ?? 25000),
    fundingTarget,
    dealType: (cleanedData.dealType as any) || 'syndication',
    imageUrl: sanitizeDealImageUrl(
      cleanedData.imageUrl as string,
      inferredAssetClass,
      inferredStrategy,
    ),
    isVerifiedOperator: Boolean(cleanedData.isVerifiedOperator ?? true),
    creatorId: (cleanedData.creatorId as string) || 'lead-investor-1',
    creator: (cleanedData.creator as any) || { name: 'PaperWorking Capital Partner' },
    createdAt: (cleanedData.createdAt as string) || new Date().toISOString(),
    projectId: (cleanedData.projectId as string) || null,
    projects: (cleanedData.projects as any[]) || [],
    commitments: (cleanedData.commitments as any[]) || [],
    invitations: (cleanedData.invitations as any[]) || [],
    ...(cleanedData.calculatorResults
      ? { calculatorResults: cleanedData.calculatorResults as any }
      : {}),
  };

  return stripUndefinedDeep(Object.assign(base, cleanedData));
}

function getReadTimeoutMs(): number {
  const envVal = Number(process.env.FIRESTORE_READ_TIMEOUT_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 2500;
}

function getWriteTimeoutMs(): number {
  const envVal = Number(process.env.FIRESTORE_WRITE_TIMEOUT_MS);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 2500;
}

async function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Retrieves a single Deal by ID or slug.
 */
export async function getDealFromStore(idOrSlug: string): Promise<RawDeal | null> {
  if (!idOrSlug) return null;

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const timeoutMs = getReadTimeoutMs();

      // First try fetching directly by doc ID
      const directSnap = await withFirestoreTimeout(
        db.collection('deals').doc(idOrSlug).get(),
        timeoutMs,
      );
      if (directSnap.exists) {
        const deal = normalizeDeal(directSnap.id, directSnap.data() as Record<string, unknown>);
        memoryDealsCache.set(deal.id, deal);
        memoryDealsCache.set(deal.slug, deal);
        return deal;
      }

      // If not found by doc ID, search by slug
      const slugQuery = await withFirestoreTimeout(
        db.collection('deals').where('slug', '==', idOrSlug).limit(1).get(),
        timeoutMs,
      );
      if (!slugQuery.empty) {
        const doc = slugQuery.docs[0];
        const deal = normalizeDeal(doc.id, doc.data() as Record<string, unknown>);
        memoryDealsCache.set(deal.id, deal);
        memoryDealsCache.set(deal.slug, deal);
        return deal;
      }

      // Check seed deals and bootstrap to Firestore if matched
      const seed = findSeedDeal(idOrSlug) || findSeedDealBySlug(idOrSlug);
      if (seed) {
        const deal = normalizeDeal(seed.id, seed as unknown as Record<string, unknown>);
        db.collection('deals')
          .doc(seed.id)
          .set(
            stripUndefinedDeep({
              ...deal,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            { merge: true },
          )
          .catch((err) => {
            console.warn(`[deal-store] Non-fatal seed bootstrap warning for ${idOrSlug}:`, err?.message || err);
          });

        memoryDealsCache.set(deal.id, deal);
        memoryDealsCache.set(deal.slug, deal);
        return deal;
      }
    } catch (err: any) {
      console.warn(`[deal-store] Firestore read failed for ${idOrSlug}, falling back to cache:`, err?.message || err);
    }
  }

  // Fallback to cache / seed
  if (memoryDealsCache.has(idOrSlug)) {
    return memoryDealsCache.get(idOrSlug)!;
  }
  const seed = findSeedDeal(idOrSlug) || findSeedDealBySlug(idOrSlug);
  if (seed) {
    const deal = normalizeDeal(seed.id, seed as unknown as Record<string, unknown>);
    memoryDealsCache.set(deal.id, deal);
    memoryDealsCache.set(deal.slug, deal);
    return deal;
  }

  return null;
}

/**
 * Lists deals from Firestore with filtering and search.
 */
export async function listDealsFromStore(options?: {
  tab?: string;
  search?: string;
  sort?: string;
}): Promise<RawDeal[]> {
  const applyFilters = (list: RawDeal[]): RawDeal[] => {
    const byId = new Map<string, RawDeal>();
    for (const item of list) {
      if (item && item.id && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
    let result = Array.from(byId.values()).sort((a, b) => {
      const aIsUserDeal = /^deal-mp-\d{10,}$/.test(a.id) ? 1 : 0;
      const bIsUserDeal = /^deal-mp-\d{10,}$/.test(b.id) ? 1 : 0;
      if (aIsUserDeal !== bIsUserDeal) return bIsUserDeal - aIsUserDeal;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    if (options?.tab) {
      const tab = options.tab.toLowerCase();
      if (tab === 'published') {
        result = result.filter((d) => d.status === 'published');
      } else if (tab === 'syndication') {
        result = result.filter((d) => d.dealType === 'syndication');
      } else if (tab === 'crowdfunding') {
        result = result.filter((d) => d.dealType === 'crowdfunding');
      }
    }
    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.address?.toLowerCase().includes(q) ||
          d.projects?.some(
            (p) =>
              p.name?.toLowerCase().includes(q) ||
              p.city?.toLowerCase().includes(q) ||
              p.subStrategy?.toLowerCase().includes(q),
          ) ||
          ((d as any).propertyName && (d as any).propertyName.toLowerCase().includes(q)) ||
          d.creator?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  };

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snap = await withFirestoreTimeout(db.collection('deals').get(), getReadTimeoutMs());

      if (!snap.empty) {
        const deals = snap.docs.map((d) => normalizeDeal(d.id, d.data()));
        for (const deal of deals) {
          memoryDealsCache.set(deal.id, deal);
          if (deal.slug) memoryDealsCache.set(deal.slug, deal);
        }
        return applyFilters(deals);
      }

      // If Firestore is empty, bootstrap from SEED_RAW_DEALS
      const batch = db.batch();
      for (const s of SEED_RAW_DEALS) {
        const deal = normalizeDeal(s.id, s as unknown as Record<string, unknown>);
        const docRef = db.collection('deals').doc(s.id);
        batch.set(
          docRef,
          stripUndefinedDeep({
            ...deal,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        );
        memoryDealsCache.set(deal.id, deal);
        if (deal.slug) memoryDealsCache.set(deal.slug, deal);
      }
      batch.commit().catch((err) => {
        console.warn('[deal-store] Non-fatal batch seed commit warning for deals:', err?.message || err);
      });
      return applyFilters(SEED_RAW_DEALS.map((s) => normalizeDeal(s.id, s as any)));
    } catch (err: any) {
      console.warn('[deal-store] Firestore list failed, falling back to cache:', err?.message || err);
    }
  }

  // Fallback to in-memory / seed data
  return applyFilters(Array.from(memoryDealsCache.values()));
}

/**
 * Creates and persists a new Deal in Firestore and memory cache.
 */
export async function createDealInStore(payload: Partial<RawDeal> & { address: string }): Promise<RawDeal> {
  const id = payload.id || `deal-${Date.now()}`;
  const deal = normalizeDeal(id, { ...payload, id });

  memoryDealsCache.set(deal.id, deal);
  if (deal.slug) memoryDealsCache.set(deal.slug, deal);
  addSeedDeal(deal);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      const firestorePayload = stripUndefinedDeep({
        ...deal,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await withFirestoreTimeout(
        db.collection('deals').doc(deal.id).set(firestorePayload),
        getWriteTimeoutMs(),
      );
    } catch (err: any) {
      console.warn(
        `[deal-store] Non-fatal Firestore write warning for deal ${deal.id}, using in-memory persistence:`,
        err?.message || err,
      );
    }
  }

  return deal;
}

/**
 * Patches an existing Deal in Firestore and memory cache.
 */
export async function patchDealInStore(
  idOrSlug: string,
  patch: Partial<RawDeal>,
): Promise<RawDeal | null> {
  const existing = await getDealFromStore(idOrSlug);
  if (!existing) return null;

  const cleanedPatch = stripUndefinedDeep(patch);
  const merged = normalizeDeal(existing.id, {
    ...existing,
    ...cleanedPatch,
  });

  memoryDealsCache.set(merged.id, merged);
  if (merged.slug) memoryDealsCache.set(merged.slug, merged);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      const firestorePatch = stripUndefinedDeep({
        ...cleanedPatch,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await withFirestoreTimeout(
        db.collection('deals').doc(existing.id).set(firestorePatch, { merge: true }),
        getWriteTimeoutMs(),
      );
    } catch (err: any) {
      console.warn(
        `[deal-store] Non-fatal Firestore update warning for deal ${existing.id}, using in-memory persistence:`,
        err?.message || err,
      );
    }
  }

  return merged;
}
