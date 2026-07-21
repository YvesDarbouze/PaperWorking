'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { DealListing, DealListingTeaser } from '@/types/listing';
import { assembleListingFromProject } from '@/lib/listings/assembler';
import { buildTeaserFromListing } from '@/lib/listings/obfuscation';
import { geocodeAddress } from '@/lib/providers/geocode';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal Listing Server Actions (AQ-27)

   CRUD operations for the Marketplace Posting feature.
   Each mutation requires an idToken and performs
   server-side auth verification before touching Firestore.
   ═══════════════════════════════════════════════════════ */

// ── Auth Verification ────────────────────────────────────

interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  accountType?: string;
  displayName?: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    if (process.env.NODE_ENV !== 'production' && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken.startsWith('mock_token_'))) {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      return {
        uid,
        email,
        displayName: name,
        role,
        accountType,
        subscriptionPlan,
        subscriptionStatus,
        organizationId,
      } as VerifiedUser;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) throw new Error('User profile not found in database.');

    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

// ── Constants ────────────────────────────────────────────

const LISTINGS_COLLECTION = 'dealListings';
const POSTING_ROLES = ['Lead Investor', 'Platform Admin', 'Admin'];

// ── Helpers ──────────────────────────────────────────────

/** Reads a listing doc and throws if it does not exist. */
async function readListingOrThrow(listingId: string) {
  const snap = await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).get();
  if (!snap.exists) throw new Error('Listing not found.');
  return { ref: snap.ref, data: snap.data() as DealListing };
}

/** Verifies the caller owns the listing. */
function assertOwner(listing: DealListing, uid: string) {
  if (listing.ownerUid !== uid) {
    throw new Error('You do not own this listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 1. CREATE DRAFT LISTING
// ─────────────────────────────────────────────────────────

export async function createDraftListing(
  idToken: string,
  projectId: string,
): Promise<{ success: true; listingId: string }> {
  try {
    const user = await verifyActionAuth(idToken);

    // Vendor accounts cannot post listings
    if (user.accountType === 'vendor') {
      throw new Error('Vendor accounts cannot post deal listings.');
    }

    // Role gate
    if (!POSTING_ROLES.includes(user.role as string)) {
      throw new Error('Insufficient privileges to post deal listings.');
    }

    // Read the source project
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) throw new Error('Project not found.');
    const projectData = projectSnap.data()!;

    // Validation: capital plan, equity terms, address
    if (projectData.financials?.capitalPlan !== 'raise interest') {
      throw new Error('Only projects with capital plan "raise interest" can be posted.');
    }
    if (!projectData.financials?.equityTerms) {
      throw new Error('Equity terms must be configured before posting.');
    }
    if (!projectData.address) {
      throw new Error('Project must have an address to create a listing.');
    }

    // Read lead investor profile
    const ownerUid = projectData.ownerUid as string;
    const ownerSnap = await adminDb.collection('users').doc(ownerUid).get();
    if (!ownerSnap.exists) throw new Error('Lead investor profile not found.');
    const ownerData = ownerSnap.data()!;

    // Assemble the listing snapshot via the pure assembler function
    const listingPayload = assembleListingFromProject(
      { id: projectId, ...projectData } as any,
      {
        uid: ownerUid,
        displayName: (ownerData.displayName as string) || 'Unknown',
        bio: ownerData.bio as string | undefined,
        avatarUrl: ownerData.avatarUrl as string | undefined,
      },
    );

    // Geocode project address
    const coords = await geocodeAddress(projectData.address as string);

    // Write the new listing document
    const now = new Date().toISOString();
    const listingRef = adminDb.collection(LISTINGS_COLLECTION).doc();

    await listingRef.set({
      ...listingPayload,
      id: listingRef.id,
      status: 'draft',
      followCount: 0,
      viewCount: 0,
      latitude: coords?.lat ?? undefined,
      longitude: coords?.lng ?? undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Tag the project with the active listing reference
    await projectRef.update({
      activeListingId: listingRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, listingId: listingRef.id };
  } catch (err) {
    console.error('createDraftListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to create draft listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 2. PUBLISH LISTING (draft → published)
// ─────────────────────────────────────────────────────────

export async function publishListing(
  idToken: string,
  listingId: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    assertOwner(listing, user.uid);

    if (listing.status !== 'draft') {
      throw new Error(`Cannot publish a listing with status "${listing.status}". Expected "draft".`);
    }

    const now = new Date().toISOString();
    await ref.update({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    });

    // Flag the project as marketplace-listed
    await adminDb.collection('projects').doc(listing.projectId).update({
      marketplaceListing: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error('publishListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to publish listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 3. PAUSE LISTING (published → paused)
// ─────────────────────────────────────────────────────────

export async function pauseListing(
  idToken: string,
  listingId: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    assertOwner(listing, user.uid);

    if (listing.status !== 'published') {
      throw new Error(`Cannot pause a listing with status "${listing.status}". Expected "published".`);
    }

    const now = new Date().toISOString();
    await ref.update({
      status: 'paused',
      pausedAt: now,
      updatedAt: now,
    });

    return { success: true };
  } catch (err) {
    console.error('pauseListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to pause listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 4. RESUME LISTING (paused → published)
// ─────────────────────────────────────────────────────────

export async function resumeListing(
  idToken: string,
  listingId: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    assertOwner(listing, user.uid);

    if (listing.status !== 'paused') {
      throw new Error(`Cannot resume a listing with status "${listing.status}". Expected "paused".`);
    }

    const now = new Date().toISOString();
    await ref.update({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    });

    return { success: true };
  } catch (err) {
    console.error('resumeListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to resume listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 5. CLOSE LISTING (any active → closed)
// ─────────────────────────────────────────────────────────

export async function closeListing(
  idToken: string,
  listingId: string,
  reason: 'manual' | 'auto_phase_advance' | 'project_archived' = 'manual',
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    assertOwner(listing, user.uid);

    if (listing.status === 'closed') {
      throw new Error('Listing is already closed.');
    }

    const now = new Date().toISOString();
    await ref.update({
      status: 'closed',
      closedAt: now,
      closedReason: reason,
      updatedAt: now,
    });

    // Clear the project's marketplace flags
    await adminDb.collection('projects').doc(listing.projectId).update({
      activeListingId: FieldValue.delete(),
      marketplaceListing: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error('closeListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to close listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 6. REFRESH LISTING SNAPSHOT
// ─────────────────────────────────────────────────────────

export async function refreshListingSnapshot(
  idToken: string,
  listingId: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    assertOwner(listing, user.uid);

    if (listing.status === 'closed') {
      throw new Error('Cannot refresh a closed listing.');
    }

    // Re-read the project
    const projectSnap = await adminDb.collection('projects').doc(listing.projectId).get();
    if (!projectSnap.exists) throw new Error('Source project not found.');
    const projectData = projectSnap.data()!;

    // Re-read lead investor profile
    const ownerSnap = await adminDb.collection('users').doc(listing.ownerUid).get();
    const ownerData = ownerSnap.exists ? ownerSnap.data()! : {};

    const freshPayload = assembleListingFromProject(
      { id: listing.projectId, ...projectData } as any,
      {
        uid: listing.ownerUid,
        displayName: (ownerData.displayName as string) || 'Unknown',
        bio: ownerData.bio as string | undefined,
        avatarUrl: ownerData.avatarUrl as string | undefined,
      },
    );

    // Geocode fresh address
    const coords = await geocodeAddress(projectData.address as string);

    const now = new Date().toISOString();
    await ref.update({
      ...freshPayload,
      latitude: coords?.lat ?? FieldValue.delete(),
      longitude: coords?.lng ?? FieldValue.delete(),
      updatedAt: now,
    });

    return { success: true };
  } catch (err) {
    console.error('refreshListingSnapshot error:', err);
    throw err instanceof Error ? err : new Error('Failed to refresh listing snapshot.');
  }
}

// ─────────────────────────────────────────────────────────
// 7. GET LISTING BY PROJECT (no auth)
// ─────────────────────────────────────────────────────────

export async function getListingByProject(
  projectId: string,
): Promise<DealListing | null> {
  try {
    const snap = await adminDb
      .collection(LISTINGS_COLLECTION)
      .where('projectId', '==', projectId)
      .where('status', '!=', 'closed')
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as DealListing;
  } catch (err) {
    console.error('getListingByProject error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch listing by project.');
  }
}

// ─────────────────────────────────────────────────────────
// 8. GET PUBLIC LISTING (no auth — returns teaser only)
// ─────────────────────────────────────────────────────────

export async function getPublicListing(
  listingId: string,
): Promise<DealListingTeaser | null> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        return {
          id: listingId,
          projectId: 'project_compose_test',
          propertyName: 'Capital Heights Teaser',
          neighborhood: 'Austin, TX',
          city: 'Austin',
          state: 'TX',
          assetClass: 'SFR',
          subStrategy: 'Long-Term',
          status: 'published',
          askingPriceApprox: '~$500K',
          capRateRange: '9–10%',
          cashOnCashRange: '8–9%',
          projectedROIRange: '12–13%',
          fundingTargetApprox: '~$200K',
          minTicketApprox: '~$10K',
          leadInvestorName: 'Marcus Aurelius',
          followCount: 5,
          viewCount: 12,
        };
      }
    }

    const snap = await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).get();
    if (!snap.exists) return null;

    const listing = snap.data() as DealListing;
    if (listing.status !== 'published') return null;

    return buildTeaserFromListing(listing);
  } catch (err) {
    console.error('getPublicListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch public listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 9. GET SUBSCRIBER LISTING (auth + subscription check)
// ─────────────────────────────────────────────────────────

export async function getSubscriberListing(
  idToken: string,
  listingId: string,
): Promise<DealListing> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        return {
          id: listingId,
          projectId: 'project_compose_test',
          organizationId: 'org_paperworking_seed',
          ownerUid: 'user_lead_investor_seed',
          propertyName: 'Capital Heights',
          address: '500 Syndicate Ave, Austin, TX',
          neighborhood: 'Austin, TX',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          assetClass: 'SFR',
          subStrategy: 'Long-Term',
          status: 'published',
          askingPriceCents: 50000000,
          capRate: 9.12,
          cashOnCash: 8.29,
          projectedROI: 12.5,
          netOperatingIncome: 4560000,
          equityTerms: {
            fundingTarget: 20000000,
            equityOfferedPct: 30,
            minTicket: 1000000,
            priceBasis: 50000000,
          },
          capitalPlan: 'raise interest',
          leadInvestor: {
            uid: 'user_lead_investor_seed',
            displayName: 'Marcus Aurelius',
            bio: 'Managing Partner at Apex Capital.',
            avatarUrl: undefined,
          },
          followCount: 5,
          viewCount: 12,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    const user = await verifyActionAuth(idToken);

    // Vendor accounts are blocked
    if (user.accountType === 'vendor') {
      throw new Error('Deal listings are not available for vendor accounts.');
    }

    // Subscription gate: must have an active, non-Vendor-Network plan
    const plan = user.subscriptionPlan as string | undefined;
    const status = user.subscriptionStatus as string | undefined;
    if (
      !plan ||
      plan === 'None' ||
      plan === 'Vendor Network' ||
      status !== 'active'
    ) {
      throw new Error('An active subscription is required to view full deal listings.');
    }

    const { ref, data: listing } = await readListingOrThrow(listingId);

    // Increment view count atomically
    await ref.update({
      viewCount: FieldValue.increment(1),
    });

    return { ...listing, viewCount: listing.viewCount + 1 };
  } catch (err) {
    console.error('getSubscriberListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch subscriber listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 10. GET PUBLISHED LISTINGS (no auth — teaser array)
// ─────────────────────────────────────────────────────────

export async function getPublishedListings(
  filters?: {
    assetClass?: string;
    state?: string;
    subStrategy?: string;
  },
): Promise<DealListingTeaser[]> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        return [
          {
            id: 'listing_1',
            projectId: 'project_compose_test',
            propertyName: 'Capital Heights Teaser',
            neighborhood: 'Austin, TX',
            city: 'Austin',
            state: 'TX',
            assetClass: 'SFR',
            subStrategy: 'Long-Term',
            status: 'published',
            askingPriceApprox: '~$500K',
            capRateRange: '9–10%',
            cashOnCashRange: '8–9%',
            projectedROIRange: '12–13%',
            fundingTargetApprox: '~$200K',
            minTicketApprox: '~$10K',
            leadInvestorName: 'Marcus Aurelius',
            followCount: 5,
            viewCount: 12,
            latitude: 30.2672,
            longitude: -97.7431,
          }
        ];
      }
    }

    let query: FirebaseFirestore.Query = adminDb
      .collection(LISTINGS_COLLECTION)
      .where('status', '==', 'published');

    if (filters?.assetClass) {
      query = query.where('assetClass', '==', filters.assetClass);
    }
    if (filters?.state) {
      query = query.where('state', '==', filters.state);
    }
    if (filters?.subStrategy) {
      query = query.where('subStrategy', '==', filters.subStrategy);
    }

    const snap = await query.get();

    const teasers = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data() as DealListing;
        if (data.latitude === undefined || data.longitude === undefined) {
          const coords = await geocodeAddress(data.address);
          if (coords) {
            data.latitude = coords.lat;
            data.longitude = coords.lng;
            await doc.ref.update({
              latitude: coords.lat,
              longitude: coords.lng,
            });
          }
        }
        return buildTeaserFromListing(data);
      })
    );
    return teasers;
  } catch (err) {
    console.error('getPublishedListings error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch published listings.');
  }
}
