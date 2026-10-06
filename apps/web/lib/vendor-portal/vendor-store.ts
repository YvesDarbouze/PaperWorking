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
      const snap = await queryRef.get();
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
      const doc = await db.collection('vendor_requests').doc(requestId).get();
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

  const updated: SeedVendorRequest = {
    ...existing,
    status: input.targetStatus,
    quotedFee: input.targetStatus === 'QUOTED' ? input.quotedFee : existing.quotedFee,
    message: input.message || existing.message,
  };

  memoryRequestsCache.set(input.requestId, updated);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('vendor_requests')
        .doc(input.requestId)
        .set(
          {
            ...updated,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (err: any) {
      console.error(`[vendor-store] Failed to update request ${input.requestId} in Firestore:`, err?.message || err);
    }
  }

  return updated;
}

export async function createVendorRequestInStore(
  payload: Partial<SeedVendorRequest> & { projectId: string; type: string },
): Promise<SeedVendorRequest> {
  ensureVendorBootstrap();

  const id = payload.id || `vreq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const record: SeedVendorRequest = {
    id,
    projectId: payload.projectId,
    status: payload.status || 'PENDING',
    type: payload.type,
    message: payload.message || '',
    requestedAt: payload.requestedAt || now,
    quotedFee: payload.quotedFee,
  };

  memoryRequestsCache.set(id, record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('vendor_requests')
        .doc(id)
        .set({
          ...record,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
    } catch (err: any) {
      console.error(`[vendor-store] Failed to create request ${id} in Firestore:`, err?.message || err);
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
      const doc = await db.collection('vendor_profiles').doc(vendorUid).get();
      if (doc.exists) {
        const data = doc.data() as VendorProfileData;
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
  const updated: VendorProfileData = {
    ...existing,
    ...profile,
    specialties: profile.specialties ?? existing.specialties,
    licensingStates: profile.licensingStates ?? existing.licensingStates,
    serviceAreas: profile.serviceAreas ?? existing.serviceAreas,
  };

  memoryProfilesCache.set(vendorUid, updated);

  // Sync to marketplace vendor directory
  const vendorRecord: Partial<VendorRecord> = {
    id: `vendor-${vendorUid}`,
    uid: vendorUid,
    companyName: updated.companyName,
    type: updated.type,
    bio: updated.bio,
    specialties: updated.specialties,
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

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('vendor_profiles')
        .doc(vendorUid)
        .set(
          {
            ...updated,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (err: any) {
      console.error(`[vendor-store] Failed to save profile ${vendorUid} to Firestore:`, err?.message || err);
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
      const snap = await db.collection('marketplace_vendors').get();
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
      if (needle === 'lawyer') return vendorType === 'lawyer' || vendorType === 'attorney';
      if (needle === 'listing agent') return vendorType === 'listing agent' || vendorType === 'agent';
      return vendorType === needle;
    });
  }

  return list;
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
  const record: VendorRecord = { ...vendor, id };

  memoryVendorsCache.set(id, record);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await db
        .collection('marketplace_vendors')
        .doc(id)
        .set(
          {
            ...record,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (err: any) {
      console.error(`[vendor-store] Failed to save marketplace vendor ${id} in Firestore:`, err?.message || err);
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
