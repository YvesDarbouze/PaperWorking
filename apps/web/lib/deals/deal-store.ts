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
 * Normalizes a raw Firestore or seed document to a complete RawDeal.
 */
function normalizeDeal(docId: string, data: Record<string, unknown>): RawDeal {
  const purchasePrice = Number(data.purchasePrice ?? 485000);
  const rehabCost = Number(data.rehabCost ?? 65000);
  const fundingTarget = Number(data.fundingTarget ?? data.target ?? Math.round(purchasePrice * 0.3 + rehabCost));

  const projectsList = Array.isArray(data.projects) ? (data.projects as Array<Record<string, unknown>>) : [];
  const firstProject = projectsList[0];
  const inferredAssetClass = ((data.assetClass as string) || (firstProject?.propertyType as string)) || undefined;
  const inferredStrategy = ((data.strategy as string) || (data.subStrategy as string) || (firstProject?.subStrategy as string)) || undefined;

  const base: RawDeal = {
    id: docId,
    slug: (data.slug as string) || docId,
    address: (data.address as string) || 'Austin, TX',
    status: (data.status as string) || 'published',
    visibility: (data.visibility as any) || 'marketplace',
    sharedWith: (data.sharedWith as string[]) || [],
    shareToken: (data.shareToken as string) || undefined,
    purchasePrice,
    rehabCost,
    arv: data.arv !== undefined && data.arv !== null ? Number(data.arv) : null,
    holdingCosts: Number(data.holdingCosts ?? 12500),
    projectedRoi: Number(data.projectedRoi ?? data.targetIrr ?? 15.0),
    targetIrr: Number(data.targetIrr ?? data.projectedRoi ?? 15.0),
    equityMultiple: Number(data.equityMultiple ?? 1.75),
    holdPeriod: (data.holdPeriod as string) || '3–5 Years',
    minInvestment: Number(data.minInvestment ?? 25000),
    fundingTarget,
    dealType: (data.dealType as any) || 'syndication',
    imageUrl: sanitizeDealImageUrl(
      data.imageUrl as string,
      inferredAssetClass,
      inferredStrategy,
    ),
    isVerifiedOperator: Boolean(data.isVerifiedOperator ?? true),
    creatorId: (data.creatorId as string) || 'lead-investor-1',
    creator: (data.creator as any) || { name: 'PaperWorking Capital Partner' },
    createdAt: (data.createdAt as string) || new Date().toISOString(),
    projectId: (data.projectId as string) || null,
    projects: (data.projects as any[]) || [],
    commitments: (data.commitments as any[]) || [],
    invitations: (data.invitations as any[]) || [],
    calculatorResults: (data.calculatorResults as any) || undefined,
  };

  return Object.assign(base, data);
}

/**
 * Retrieves a single Deal by ID or slug.
 */
export async function getDealFromStore(idOrSlug: string): Promise<RawDeal | null> {
  if (!idOrSlug) return null;

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();

      // First try fetching directly by doc ID
      const directSnap = await db.collection('deals').doc(idOrSlug).get();
      if (directSnap.exists) {
        const deal = normalizeDeal(directSnap.id, directSnap.data() as Record<string, unknown>);
        memoryDealsCache.set(deal.id, deal);
        memoryDealsCache.set(deal.slug, deal);
        return deal;
      }

      // If not found by doc ID, search by slug
      const slugQuery = await db.collection('deals').where('slug', '==', idOrSlug).limit(1).get();
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
            {
              ...deal,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
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
    let result = [...list];
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
      const snap = await db.collection('deals').get();

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
        batch.set(docRef, { ...deal, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
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
      await db
        .collection('deals')
        .doc(deal.id)
        .set({
          ...deal,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
    } catch (err: any) {
      console.error(`[deal-store] Failed to write deal ${deal.id} to Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to create deal in Firestore (${err?.message || 'timeout'})`);
      }
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

  const merged = normalizeDeal(existing.id, {
    ...existing,
    ...patch,
  });

  memoryDealsCache.set(merged.id, merged);
  if (merged.slug) memoryDealsCache.set(merged.slug, merged);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('deals')
        .doc(existing.id)
        .set(
          {
            ...patch,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (err: any) {
      console.error(`[deal-store] Failed to update deal ${existing.id} in Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to update deal in Firestore (${err?.message || 'timeout'})`);
      }
    }
  }

  return merged;
}
