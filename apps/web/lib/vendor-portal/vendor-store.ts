/**
 * Authoritative Server-side Vendor Portal & Marketplace Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for:
 * 1. Vendor Requests & Bids (`vendor_requests/{requestId}`)
 * 2. Vendor Profiles (`vendor_profiles/{vendorUid}`)
 * 3. Marketplace Vendor Directory (`marketplace_vendors/{vendorId}`)
 * 4. Marketplace Deal Listings (aggregated dynamically from `deals` and `marketplace_listings`)
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { secureRandomHex } from '@/lib/utils/secure-id';
import type {
  SeedVendorRequest,
  VendorProfileData,
  VendorRequestStatus,
} from './seed-data';
import {
  SEED_MARKETPLACE_LISTINGS,
  SEED_MARKETPLACE_VENDORS,
  type RawDeal,
} from '@/lib/marketplace/seed-data';
import { listDealsFromStore } from '@/lib/deals/deal-store';
import type { VendorRecord } from '@paperworking/api';

export interface DealListingRecord {
  id: string;
  visibility?: string;
  visibilityMode?: string;
  isNewListing?: boolean;
  createdAt?: string | number | Date;
  [key: string]: unknown;
}

declare global {
  // eslint-disable-next-line no-var
  var __pw_vendor_requests_cache: Map<string, SeedVendorRequest> | undefined;
  // eslint-disable-next-line no-var
  var __pw_vendor_profiles_cache: Map<string, VendorProfileData> | undefined;
  // eslint-disable-next-line no-var
  var __pw_marketplace_vendors_cache: Map<string, VendorRecord> | undefined;
  // eslint-disable-next-line no-var
  var __pw_marketplace_listings_cache: Map<string, DealListingRecord> | undefined;
}

const memoryRequestsCache: Map<string, SeedVendorRequest> =
  globalThis.__pw_vendor_requests_cache ??
  (globalThis.__pw_vendor_requests_cache = new Map<string, SeedVendorRequest>());

const memoryProfilesCache: Map<string, VendorProfileData> =
  globalThis.__pw_vendor_profiles_cache ??
  (globalThis.__pw_vendor_profiles_cache = new Map<string, VendorProfileData>());

const memoryVendorsCache: Map<string, VendorRecord> =
  globalThis.__pw_marketplace_vendors_cache ??
  (globalThis.__pw_marketplace_vendors_cache = new Map<string, VendorRecord>());

const memoryListingsCache: Map<string, DealListingRecord> =
  globalThis.__pw_marketplace_listings_cache ??
  (globalThis.__pw_marketplace_listings_cache = new Map<string, DealListingRecord>());

// Default seed data for initial bootstrap
const INITIAL_SEED_REQUESTS: SeedVendorRequest[] = [
  {
    id: 'vreq-1',
    projectId: 'deal-1',
    status: 'PENDING',
    type: 'General Contractor',
    message: 'Need rehab quote for kitchen and bathrooms.',
    requestedAt: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'vreq-2',
    projectId: 'deal-2',
    status: 'QUOTED',
    type: 'Property Manager',
    message: 'Monthly management proposal requested.',
    requestedAt: '2026-08-02T14:00:00.000Z',
    quotedFee: 2400,
  },
  {
    id: 'vreq-3',
    projectId: 'deal-3',
    status: 'ACCEPTED',
    type: 'Title Company',
    message: 'Closing services for acquisition.',
    requestedAt: '2026-07-20T09:00:00.000Z',
    quotedFee: 1850,
  },
  {
    id: 'vreq-4',
    projectId: 'deal-1',
    status: 'DECLINED',
    type: 'Inspector',
    message: 'Full property inspection.',
    requestedAt: '2026-07-15T08:00:00.000Z',
  },
];

const DEFAULT_VENDOR_PROFILE: VendorProfileData = {
  companyName: 'PaperWorking Trades Co.',
  type: 'General Contractor',
  vendorSkills: ['General Contractor'],
  specialties: ['Rehab', 'Kitchen remodel', 'Roofing'],
  licensingStates: ['TX', 'CA'],
  serviceAreas: ['Austin, TX', 'Los Angeles, CA'],
  bio: 'Licensed contractor team focused on value-add rehabs and turn-key punch lists.',
  feeRangeLabel: '$50k–$120k per project',
  avgTurnaroundDays: 5,
  availability: 'Available',
  logoUrl: '',
  bannerUrl: '',
};

function ensureVendorBootstrap(): void {
  if (memoryRequestsCache.size === 0) {
    for (const r of INITIAL_SEED_REQUESTS) {
      memoryRequestsCache.set(r.id, { ...r });
    }
  }
  if (!memoryProfilesCache.has('dev-user-1')) {
    memoryProfilesCache.set('dev-user-1', { ...DEFAULT_VENDOR_PROFILE });
  }
  if (memoryVendorsCache.size === 0) {
    for (const v of SEED_MARKETPLACE_VENDORS) {
      memoryVendorsCache.set(v.id, { ...v } as VendorRecord);
    }
  }
  if (memoryListingsCache.size === 0) {
    for (const l of SEED_MARKETPLACE_LISTINGS) {
      memoryListingsCache.set(l.id, { ...l } as DealListingRecord);
    }
  }
}

// Initial bootstrap call
ensureVendorBootstrap();

export const FIRESTORE_READ_TIMEOUT_MS = Number(process.env.FIRESTORE_READ_TIMEOUT_MS ?? 800);
export const FIRESTORE_WRITE_TIMEOUT_MS = Number(process.env.FIRESTORE_WRITE_TIMEOUT_MS ?? 1500);

function withFirestoreTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = FIRESTORE_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore ${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

/* =========================================================================
   1. VENDOR REQUESTS & BIDS
   ========================================================================= */

export async function listVendorRequestsFromStore(
  vendorUid?: string,
  organizationId?: string,
): Promise<SeedVendorRequest[]> {
  ensureVendorBootstrap();

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      let queryRef: FirebaseFirestore.Query = db.collection('vendor_requests');
      if (organizationId) {
        queryRef = queryRef.where('organizationId', '==', organizationId);
      }
      const snap = await withFirestoreTimeout(queryRef.get(), 'list vendor_requests', FIRESTORE_READ_TIMEOUT_MS);
      if (!snap.empty) {
        const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeedVendorRequest);
        for (const r of records) {
          memoryRequestsCache.set(r.id, r);
        }
        return records;
      }
    } catch (err: any) {
      console.warn('[vendor-store] Firestore read failed for vendor_requests:', err?.message || err);
    }
  }

  return Array.from(memoryRequestsCache.values());
}

export async function getVendorRequestFromStore(
  requestId: string,
): Promise<SeedVendorRequest | null> {
  ensureVendorBootstrap();

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await withFirestoreTimeout(
        db.collection('vendor_requests').doc(requestId).get(),
        `read vendor_requests/${requestId}`,
        FIRESTORE_READ_TIMEOUT_MS,
      );
      if (doc.exists) {
        const record = { id: doc.id, ...doc.data() } as SeedVendorRequest;
        memoryRequestsCache.set(requestId, record);
        return record;
      }
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore get failed for request ${requestId}:`, err?.message || err);
    }
  }

  return memoryRequestsCache.get(requestId) || null;
}

export async function updateVendorRequestInStore(input: {
  requestId: string;
  projectId: string;
  targetStatus: 'QUOTED' | 'DECLINED';
  quotedFee?: number;
  message?: string;
  vendorUid?: string;
}): Promise<SeedVendorRequest> {
  ensureVendorBootstrap();

  const existing =
    (await getVendorRequestFromStore(input.requestId)) ||
    memoryRequestsCache.get(input.requestId);

  if (!existing) {
    throw new Error('Request not found');
  }

  const updated: SeedVendorRequest = stripUndefinedDeep({
    ...existing,
    status: input.targetStatus,
    quotedFee: input.targetStatus === 'QUOTED' ? input.quotedFee : existing.quotedFee,
    message: input.message || existing.message,
  });

  memoryRequestsCache.set(input.requestId, updated);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await withFirestoreTimeout(
        db
          .collection('vendor_requests')
          .doc(input.requestId)
          .set(
            {
              ...updated,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        `write vendor_requests/${input.requestId}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[vendor-store] Failed to update request ${input.requestId} in Firestore:`, err?.message || err);
    }
  }

  return updated;
}

export async function createVendorRequestInStore(
  payload: Partial<SeedVendorRequest> & { projectId: string; type: string },
): Promise<SeedVendorRequest> {
  ensureVendorBootstrap();

  const id = payload.id || `vreq-${secureRandomHex(12)}`;
  const now = new Date().toISOString();

  const record: SeedVendorRequest = stripUndefinedDeep({
    id,
    projectId: payload.projectId,
    status: payload.status || 'PENDING',
    type: payload.type,
    message: payload.message || '',
    requestedAt: payload.requestedAt || now,
    quotedFee: payload.quotedFee,
    ...(payload.vendorId ? { vendorId: payload.vendorId } : {}),
    ...(payload.requesterUid ? { requesterUid: payload.requesterUid } : {}),
    ...(payload.projectLabel ? { projectLabel: payload.projectLabel } : {}),
    ...(payload.location ? { location: payload.location } : {}),
  });

  memoryRequestsCache.set(id, record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await withFirestoreTimeout(
        db
          .collection('vendor_requests')
          .doc(id)
          .set({
            ...record,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }),
        `create vendor_requests/${id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore fallback for request ${id}: saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return record;
}

/* =========================================================================
   2. VENDOR PROFILES
   ========================================================================= */

export async function getVendorProfileFromStore(
  vendorUid = 'dev-user-1',
): Promise<VendorProfileData> {
  ensureVendorBootstrap();

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const doc = await withFirestoreTimeout(
        db.collection('vendor_profiles').doc(vendorUid).get(),
        `read vendor_profiles/${vendorUid}`,
        FIRESTORE_READ_TIMEOUT_MS,
      );
      if (doc.exists) {
        const data = stripUndefinedDeep(doc.data() as VendorProfileData);
        memoryProfilesCache.set(vendorUid, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore read failed for vendor profile ${vendorUid}:`, err?.message || err);
    }
  }

  return memoryProfilesCache.get(vendorUid) || DEFAULT_VENDOR_PROFILE;
}

export async function updateVendorProfileInStore(
  vendorUid: string = 'dev-user-1',
  profile: Partial<VendorProfileData>,
): Promise<VendorProfileData> {
  ensureVendorBootstrap();

  const existing = await getVendorProfileFromStore(vendorUid);
  const sanitizedProfile = stripUndefinedDeep(profile);
  const updated: VendorProfileData = stripUndefinedDeep({
    ...existing,
    ...sanitizedProfile,
    specialties: sanitizedProfile.specialties ?? existing.specialties,
    licensingStates: sanitizedProfile.licensingStates ?? existing.licensingStates,
    serviceAreas: sanitizedProfile.serviceAreas ?? existing.serviceAreas,
    vendorSkills: sanitizedProfile.vendorSkills ?? existing.vendorSkills,
  });

  memoryProfilesCache.set(vendorUid, updated);

  const vendorId = `vendor-${vendorUid}`;
  const effectiveSkills = updated.vendorSkills ?? (updated.type ? [updated.type] : []);
  const hasSkills = Boolean(
    effectiveSkills && effectiveSkills.length >= 1 && effectiveSkills.length <= 3,
  );

  // Sync or delist in marketplace vendor directory
  if (hasSkills) {
    const primarySkill = effectiveSkills[0] || updated.type || 'General Contractor';
    const vendorRecord: Partial<VendorRecord> & { vendorSkills?: string[] } = {
      id: vendorId,
      uid: vendorUid,
      companyName: updated.companyName,
      type: primarySkill,
      bio: updated.bio,
      specialties: effectiveSkills || updated.specialties,
      vendorSkills: effectiveSkills,
      licensingStates: updated.licensingStates,
      serviceAreas: updated.serviceAreas,
      city: updated.serviceAreas[0]?.split(',')[0] || 'Austin',
      location: updated.serviceAreas[0] || 'Austin, TX',
      feeRangeLabel: updated.feeRangeLabel,
      availability: updated.availability,
      avgTurnaroundDays: updated.avgTurnaroundDays,
      verified: true,
      insuranceVerified: true,
    };
    await upsertMarketplaceVendorInStore(vendorRecord as VendorRecord);
  } else if (updated.vendorSkills && updated.vendorSkills.length === 0) {
    await deleteMarketplaceVendorFromStore(vendorId);
  }

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await withFirestoreTimeout(
        db
          .collection('vendor_profiles')
          .doc(vendorUid)
          .set(
            {
              ...updated,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        `write vendor_profiles/${vendorUid}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore fallback for vendor profile ${vendorUid}: saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return updated;
}

/* =========================================================================
   3. MARKETPLACE VENDORS DIRECTORY
   ========================================================================= */

export async function listMarketplaceVendorsFromStore(filters?: {
  type?: string | null;
  state?: string | null;
  search?: string | null;
  city?: string | null;
  id?: string | null;
}): Promise<VendorRecord[]> {
  ensureVendorBootstrap();

  let list: VendorRecord[] = Array.from(memoryVendorsCache.values());

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snap = await withFirestoreTimeout(
        db.collection('marketplace_vendors').get(),
        'list marketplace_vendors',
        FIRESTORE_READ_TIMEOUT_MS,
      );
      if (!snap.empty) {
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VendorRecord);
        for (const v of list) {
          if (v.id) memoryVendorsCache.set(v.id, v);
        }
      }
    } catch (err: any) {
      console.warn('[vendor-store] Firestore read failed for marketplace_vendors:', err?.message || err);
    }
  }

  if (filters?.id) {
    const single = list.find((v) => v.id === filters.id || (v as any).uid === filters.id);
    return single ? [single] : [];
  }

  if (filters?.type && filters.type !== 'All') {
    const needle = filters.type.toLowerCase();
    list = list.filter((v) => {
      const vendorType = String(v.type ?? '').toLowerCase();
      const rawSkills: string[] = ((v as any).vendorSkills ?? v.specialties ?? []);
      const skills = rawSkills.map((s) => String(s).toLowerCase());
      if (needle === 'lawyer' || needle === 'attorneys') {
        return (
          vendorType === 'lawyer' ||
          vendorType === 'attorney' ||
          skills.some((s) => s.includes('attorney') || s.includes('lawyer'))
        );
      }
      if (needle === 'listing agent' || needle === 'agents') {
        return (
          vendorType === 'listing agent' ||
          vendorType === 'agent' ||
          skills.some((s) => s.includes('broker') || s.includes('agent'))
        );
      }
      return vendorType === needle || skills.some((s) => s.includes(needle));
    });
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter((v) => {
      const name = String(v.companyName ?? '').toLowerCase();
      const type = String(v.type ?? '').toLowerCase();
      const bio = String(v.bio ?? '').toLowerCase();
      const rawSkills: string[] = ((v as any).vendorSkills ?? v.specialties ?? []);
      const skills = rawSkills.map((s) => String(s).toLowerCase());
      return name.includes(q) || type.includes(q) || bio.includes(q) || skills.some((s) => s.includes(q));
    });
  }

  return list;
}

export async function deleteMarketplaceVendorFromStore(id: string): Promise<void> {
  ensureVendorBootstrap();
  memoryVendorsCache.delete(id);
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection('marketplace_vendors').doc(id).delete(),
        `delete marketplace_vendors/${id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore delete failed for vendor ${id}:`, err?.message || err);
    }
  }
}

export async function getMarketplaceVendorFromStore(id: string): Promise<VendorRecord | null> {
  const matches = await listMarketplaceVendorsFromStore({ id });
  return matches[0] || null;
}

export async function upsertMarketplaceVendorInStore(
  vendor: VendorRecord & { id?: string },
): Promise<VendorRecord> {
  ensureVendorBootstrap();

  const id = vendor.id || `vendor-${Date.now()}`;
  const record: VendorRecord = stripUndefinedDeep({ ...vendor, id });

  memoryVendorsCache.set(id, record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await withFirestoreTimeout(
        db
          .collection('marketplace_vendors')
          .doc(id)
          .set(
            {
              ...record,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        `write marketplace_vendors/${id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[vendor-store] Firestore fallback for marketplace vendor ${id}: saved to memory cache (${err?.message || 'timeout'}).`);
    }
  }

  return record;
}

/* =========================================================================
   4. DYNAMIC MARKETPLACE LISTINGS
   ========================================================================= */

function dealToListingRecord(deal: RawDeal): DealListingRecord {
  const isPublic = deal.visibility === 'public' || deal.visibility === 'marketplace';
  const price = deal.purchasePrice || deal.fundingTarget || 0;
  const budget = price >= 1000 ? `$${Math.round(price / 1000)}k` : `$${price}`;

  return {
    id: `listing-${deal.id}`,
    dealId: deal.id,
    title: deal.address,
    vendorType: deal.dealType === 'crowdfunding' ? 'Crowdfunding Deal' : 'Syndication Deal',
    visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
    visibilityMode: isPublic ? 'PUBLIC' : 'PRIVATE',
    isNewListing: true,
    createdAt: deal.createdAt || new Date().toISOString(),
    city: deal.address.split(',')[1]?.trim() || 'Austin, TX',
    budgetRange: budget,
    responseTime: '< 24h',
    targetIrr: deal.targetIrr,
    equityMultiple: deal.equityMultiple,
    imageUrl: deal.imageUrl,
  };
}

export async function listMarketplaceListingsFromStore(): Promise<DealListingRecord[]> {
  ensureVendorBootstrap();

  const listingsMap = new Map<string, DealListingRecord>();

  // 1. Add baseline seed listings
  for (const seed of SEED_MARKETPLACE_LISTINGS) {
    listingsMap.set(seed.id, { ...seed } as DealListingRecord);
  }

  // 2. Add cached/stored custom marketplace listings
  for (const l of memoryListingsCache.values()) {
    listingsMap.set(l.id, l);
  }

  // 3. Dynamically incorporate published deals from deal-store
  try {
    const deals = await listDealsFromStore();
    for (const deal of deals) {
      if (deal.status === 'published' || deal.visibility === 'marketplace' || deal.visibility === 'public') {
        const listing = dealToListingRecord(deal);
        listingsMap.set(listing.id, listing);
      }
    }
  } catch (err: any) {
    console.warn('[vendor-store] Error loading published deals for marketplace listings:', err?.message || err);
  }

  return Array.from(listingsMap.values());
}
