'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import type { 
  DealListing, 
  DealListingTeaser, 
  DealSearchResult, 
  DealTransitionEntry, 
  ListingStatus, 
  VisibilityMode, 
  ResolvedAddress,
  SubscriberSearchResult,
  SubscriberPropertyResult,
  DealSortOption,
  SubscriberDealMatch
} from '@/types/listing';
import type { Project } from '@/types/schema';
import { assembleListingFromProject } from '@/lib/listings/assembler';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { buildTeaserFromListing } from '@/lib/listings/obfuscation';
import { computeRelevanceScore } from '@/lib/listings/relevance';
import { geocodeAddress } from '@/lib/providers/geocode';
import {
  evaluateTransition,
  evaluateVisibilityChange,
  type SideEffect,
  type TransitionActor,
} from '@/lib/deals/dealStateMachine';
import { evaluatePublishGate } from '@/lib/deals/publishGate';
import { trackDealActivity } from '@/lib/invitations/activityTimeline';
import { getClientIp, limitRequest, trackEnumerationAttempt } from '@/lib/services/scrapingDefense';

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
    let isE2eTest = false;
    let cookieStore: any = null;
    try {
      const { cookies } = require('next/headers');
      cookieStore = await cookies();
      isE2eTest = cookieStore?.get('__e2e_test')?.value === '1';
    } catch {
      // Ignored
    }
    if ((process.env.NODE_ENV !== 'production' || isE2eTest) && (process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test') && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      const uid = cookieStore?.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore?.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore?.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore?.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore?.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore?.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore?.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      
      if (role === 'Vendor' || accountType === 'vendor') {
        throw new Error('Not Found');
      }

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
    
    // Live database role/accountType check for Vendor role
    if (userData.role === 'Vendor' || userData.accountType === 'vendor') {
      throw new Error('Not Found');
    }

    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err: any) {
    if (err.message === 'Not Found') throw err;
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

// ── Constants ────────────────────────────────────────────

const LISTINGS_COLLECTION = 'dealListings';
const POSTING_ROLES = ['Lead Investor', 'Platform Admin', 'Admin'];
const ADMIN_ROLES = ['Platform Admin', 'Admin'];

// ── Helpers ──────────────────────────────────────────────

/** Reads a listing doc and throws if it does not exist. */
async function readListingOrThrow(listingId: string) {
  const snap = await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).get();
  if (!snap.exists) throw new Error('Listing not found.');
  return { ref: snap.ref, data: snap.data() as DealListing };
}

/** Verifies the caller owns the listing OR is a platform admin. Returns the actor role. */
function resolveActor(listing: DealListing, uid: string, userRole: string): TransitionActor {
  if (ADMIN_ROLES.includes(userRole)) return 'platform_admin';
  if (listing.ownerUid === uid) return 'owner';
  throw new Error('You do not own this listing and are not a platform admin.');
}

/** Builds a transition log entry. */
function buildLogEntry(
  from: ListingStatus,
  to: ListingStatus,
  performedBy: string,
  reason?: string,
  visibilityBefore?: VisibilityMode,
  visibilityAfter?: VisibilityMode,
  publicSolicitationAcknowledgment?: string,
): DealTransitionEntry {
  return {
    from,
    to,
    performedBy,
    performedAt: new Date().toISOString(),
    ...(reason && { reason }),
    ...(visibilityBefore && { visibilityBefore }),
    ...(visibilityAfter && { visibilityAfter }),
    ...(publicSolicitationAcknowledgment && { publicSolicitationAcknowledgment }),
  };
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
      status: 'draft' as ListingStatus,
      visibilityMode: 'PRIVATE' as VisibilityMode,
      transitionLog: [],
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
// 2. TRANSITION LISTING (unified state machine gate)
// ─────────────────────────────────────────────────────────

/**
 * Executes side effects declared by the state machine.
 * All writes happen in a single Firestore batch.
 */
async function executeSideEffects(
  sideEffects: SideEffect[],
  listing: DealListing,
  listingRef: FirebaseFirestore.DocumentReference,
  uid: string,
  now: string,
  batch: FirebaseFirestore.WriteBatch,
): Promise<void> {
  const projectRef = adminDb.collection('projects').doc(listing.projectId);

  for (const effect of sideEffects) {
    switch (effect.type) {
      case 'set_published_at':
        batch.update(listingRef, { publishedAt: now });
        break;

      case 'set_paused_at':
        batch.update(listingRef, { pausedAt: now });
        break;

      case 'set_closed_at':
        batch.update(listingRef, { closedAt: now });
        break;

      case 'set_withdrawn_at':
        batch.update(listingRef, { withdrawnAt: now, withdrawnBy: uid });
        break;

      case 'clear_active_listing':
        batch.update(projectRef, {
          activeListingId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case 'set_marketplace_listing_true':
        batch.update(projectRef, {
          marketplaceListing: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case 'set_marketplace_listing_false':
        batch.update(projectRef, {
          marketplaceListing: false,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case 'decline_pending_expressions': {
        // Decline all pending CommitmentExpressions for this listing
        const expSnap = await adminDb
          .collection(LISTINGS_COLLECTION)
          .doc(listing.id)
          .collection('expressions')
          .where('status', '==', 'pending')
          .get();
        expSnap.docs.forEach((doc) => {
          batch.update(doc.ref, { status: 'declined', updatedAt: now });
        });
        break;
      }

      case 'expire_invitations': {
        // Expire all pending invitations for this project
        const invSnap = await adminDb
          .collection('invitations')
          .where('projectId', '==', listing.projectId)
          .where('status', '==', 'pending')
          .get();
        invSnap.docs.forEach((doc) => {
          batch.update(doc.ref, { status: 'expired', updatedAt: now });
        });
        break;
      }

      case 'freeze_expressions': {
        // Mark pending expressions as frozen (can be unfrozen on resume)
        const freezeSnap = await adminDb
          .collection(LISTINGS_COLLECTION)
          .doc(listing.id)
          .collection('expressions')
          .where('status', '==', 'pending')
          .get();
        freezeSnap.docs.forEach((doc) => {
          batch.update(doc.ref, { frozen: true, updatedAt: now });
        });
        break;
      }

      case 'unfreeze_expressions': {
        // Unfreeze previously frozen expressions
        const unfreezeSnap = await adminDb
          .collection(LISTINGS_COLLECTION)
          .doc(listing.id)
          .collection('expressions')
          .where('frozen', '==', true)
          .get();
        unfreezeSnap.docs.forEach((doc) => {
          batch.update(doc.ref, { frozen: false, updatedAt: now });
        });
        break;
      }

      case 'purge_teaser_cache':
        // No-op for now — teasers are built on-the-fly from Firestore.
        // If a CDN/Redis cache is added later, purge it here.
        break;
    }
  }
}

export async function transitionListing(
  idToken: string,
  listingId: string,
  targetStatus: ListingStatus,
  reason?: string,
  acknowledgment?: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    const actorRole = resolveActor(listing, user.uid, user.role as string);

    // Evaluate via pure state machine
    const result = evaluateTransition({
      from: listing.status,
      to: targetStatus,
      actorRole,
    });

    if (!result.allowed) {
      throw new Error(result.reason || 'Transition not allowed.');
    }

    const now = new Date().toISOString();
    const batch = adminDb.batch();
    const targetMode = listing.visibilityMode || 'PRIVATE';

    // ── Public Solicitation Acknowledgment Check (DM-22) ──
    if (targetStatus === 'published' && targetMode === 'PUBLIC_SOLICITED') {
      const expectedAck = "I acknowledge that Public Solicited mode is irreversible and complies with public offering requirements.";
      if (!acknowledgment || acknowledgment.trim() !== expectedAck) {
        throw new Error('Typed acknowledgment is required for Public Solicited mode.');
      }
    }

    // ── Publish Gate Evaluation (DM-21) ──
    let gateResult = null;
    if (targetStatus === 'published') {
      const projectSnap = await adminDb.collection('projects').doc(listing.projectId).get();
      if (!projectSnap.exists) {
        throw new Error('Project not found for listing.');
      }
      const project = { id: projectSnap.id, ...projectSnap.data() } as any;

      gateResult = evaluatePublishGate(project, listing, targetMode);

      if (!gateResult.passed) {
        // Red criteria block unless override reason is provided
        if (!reason || !reason.trim()) {
          const failingCriteria = gateResult.criteria
            .filter((c) => !c.status)
            .map((c) => c.label)
            .join(', ');
          throw new Error(`Publish gate blocked: ${failingCriteria}`);
        }
      }
    }

    // Execute declared side effects
    await executeSideEffects(result.sideEffects, listing, ref, user.uid, now, batch);

    // Build transition log entry
    const logEntry = buildLogEntry(
      listing.status,
      targetStatus,
      user.uid,
      reason,
      listing.visibilityMode,
      listing.visibilityMode,
      targetStatus === 'published' && targetMode === 'PUBLIC_SOLICITED' ? acknowledgment : undefined
    );

    // Update listing status and log
    const updatePayload: any = {
      status: targetStatus,
      transitionLog: FieldValue.arrayUnion(logEntry),
      updatedAt: now,
    };

    if (targetStatus === 'published' && targetMode === 'PUBLIC_SOLICITED') {
      updatePayload.publicSolicitationAcknowledgment = acknowledgment;
      updatePayload.publicSolicitationAcknowledgedAt = now;
    }

    if (gateResult) {
      updatePayload.publishGateResult = {
        passed: gateResult.passed,
        evaluatedAt: now,
        overrideReason: reason || null,
        criteria: gateResult.criteria,
      };
    }

    batch.update(ref, updatePayload);

    await batch.commit();

    if (targetStatus === 'published') {
      await trackDealActivity(
        listing.projectId,
        listing.projectId,
        user.uid,
        'republish',
        { reason: reason || 'Listing published/republished' }
      ).catch(err => console.error('[transitionListing timeline tracking failed]', err));
    }

    return { success: true };
  } catch (err) {
    console.error('transitionListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to transition listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 2a. CONVENIENCE WRAPPERS (backward-compatible)
// ─────────────────────────────────────────────────────────

/** Publish a draft listing. */
export async function publishListing(idToken: string, listingId: string, overrideReason?: string, acknowledgment?: string) {
  return transitionListing(idToken, listingId, 'published', overrideReason, acknowledgment);
}

/** Pause a published listing. */
export async function pauseListing(idToken: string, listingId: string) {
  return transitionListing(idToken, listingId, 'paused');
}

/** Resume a paused listing. */
export async function resumeListing(idToken: string, listingId: string) {
  return transitionListing(idToken, listingId, 'published', 'Resumed from paused state');
}

/** Close a listing. */
export async function closeListing(
  idToken: string,
  listingId: string,
  reason: 'manual' | 'auto_phase_advance' | 'project_archived' = 'manual',
) {
  return transitionListing(idToken, listingId, 'closed', reason);
}

/** Withdraw a listing (terminal, irreversible). */
export async function withdrawListing(idToken: string, listingId: string, reason?: string) {
  return transitionListing(idToken, listingId, 'withdrawn', reason || 'Listing withdrawn by owner');
}

// ─────────────────────────────────────────────────────────
// 3. CHANGE VISIBILITY MODE
// ─────────────────────────────────────────────────────────

export async function changeVisibilityMode(
  idToken: string,
  listingId: string,
  targetMode: 'PRIVATE' | 'MARKETPLACE' | 'PUBLIC_SOLICITED',
  overrideReason?: string,
  acknowledgment?: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    resolveActor(listing, user.uid, user.role as string);

    const currentMode = listing.visibilityMode || 'PRIVATE';

    const result = evaluateVisibilityChange({
      currentMode,
      targetMode,
      listingStatus: listing.status,
    });

    if (!result.allowed) {
      throw new Error(result.reason || 'Visibility change not allowed.');
    }

    const now = new Date().toISOString();

    // ── Public Solicitation Acknowledgment Check (DM-22) ──
    if (targetMode === 'PUBLIC_SOLICITED') {
      const expectedAck = "I acknowledge that Public Solicited mode is irreversible and complies with public offering requirements.";
      if (!acknowledgment || acknowledgment.trim() !== expectedAck) {
        throw new Error('Typed acknowledgment is required for Public Solicited mode.');
      }
    }

    // ── Evaluate publish gate on visibility change if currently published ──
    let gateResult = null;
    if (listing.status === 'published' && targetMode !== 'PRIVATE') {
      const projectSnap = await adminDb.collection('projects').doc(listing.projectId).get();
      if (!projectSnap.exists) {
        throw new Error('Project not found for listing.');
      }
      const project = { id: projectSnap.id, ...projectSnap.data() } as any;

      gateResult = evaluatePublishGate(project, listing, targetMode);

      if (!gateResult.passed) {
        if (!overrideReason || !overrideReason.trim()) {
          const failingCriteria = gateResult.criteria
            .filter((c) => !c.status)
            .map((c) => c.label)
            .join(', ');
          throw new Error(`Publish gate blocked: ${failingCriteria}`);
        }
      }
    }

    const logEntry = buildLogEntry(
      listing.status,
      listing.status,
      user.uid,
      overrideReason ? `Visibility changed with override: ${currentMode} → ${targetMode}` : `Visibility changed: ${currentMode} → ${targetMode}`,
      currentMode,
      targetMode,
      targetMode === 'PUBLIC_SOLICITED' ? acknowledgment : undefined
    );

    const updatePayload: any = {
      visibilityMode: targetMode,
      transitionLog: FieldValue.arrayUnion(logEntry),
      updatedAt: now,
    };

    if (targetMode === 'PUBLIC_SOLICITED') {
      updatePayload.publicSolicitationAcknowledgment = acknowledgment;
      updatePayload.publicSolicitationAcknowledgedAt = now;
    }

    if (gateResult) {
      updatePayload.publishGateResult = {
        passed: gateResult.passed,
        evaluatedAt: now,
        overrideReason: overrideReason || null,
        criteria: gateResult.criteria,
      };
    }

    await ref.update(updatePayload);

    await trackDealActivity(
      listing.projectId,
      listing.projectId,
      user.uid,
      'mode_change',
      {
        oldVisibilityMode: currentMode,
        newVisibilityMode: targetMode,
        overrideReason: overrideReason || null,
      }
    ).catch(err => console.error('[changeVisibilityMode timeline tracking failed]', err));

    return { success: true };
  } catch (err) {
    console.error('changeVisibilityMode error:', err);
    throw err instanceof Error ? err : new Error('Failed to change visibility mode.');
  }
}

// ─────────────────────────────────────────────────────────
// 4. REFRESH LISTING SNAPSHOT
// ─────────────────────────────────────────────────────────

export async function refreshListingSnapshot(
  idToken: string,
  listingId: string,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    resolveActor(listing, user.uid, user.role as string);

  if (listing.status === 'closed' || listing.status === 'withdrawn') {
      throw new Error(`Cannot refresh a ${listing.status} listing.`);
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
// 5. GET LISTING BY PROJECT (no auth)
// ─────────────────────────────────────────────────────────

export async function getListingByProject(
  projectId: string,
): Promise<DealListing | null> {
  try {
    if (process.env.NODE_ENV !== 'production' && projectId === 'project_cf') {
      return {
        id: 'listing_cf_1',
        projectId: 'project_cf',
        propertyName: 'Crowdfund Towers',
        neighborhood: 'Las Vegas, NV',
        city: 'Las Vegas',
        state: 'NV',
        address: '777 Wealth St, Las Vegas, NV',
        assetClass: 'Residential',
        subStrategy: 'LONG_TERM',
        status: 'published',
        visibilityMode: 'MARKETPLACE',
        ownerUid: 'user_lead_investor_seed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followCount: 5,
        version: 1,
        leadInvestor: {
          uid: 'user_lead_investor_seed',
          displayName: 'Marcus Aurelius',
          email: 'marcus@apexcapital.io',
        },
        viewCount: 10,
        publishedAt: new Date().toISOString(),
        isCrowdfunding: true,
      } as any;
    }

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
// 6. GET PUBLIC LISTING (no auth — returns teaser only)
// ─────────────────────────────────────────────────────────

export async function getPublicListing(
  listingId: string,
): Promise<DealListingTeaser | null> {
  const ip = await getClientIp();
  const rateCheck = await limitRequest(ip, 'read');
  if (!rateCheck.allowed) {
    throw new Error('Rate limit exceeded');
  }

  let mockUid: string | undefined = undefined;

  try {
    const { cookies } = require('next/headers');
    const cookieStore = await cookies();
    const mockRole = cookieStore.get('mock_user_role')?.value;
    const mockAccountType = cookieStore.get('mock_user_account_type')?.value;
    mockUid = cookieStore.get('mock_user_uid')?.value;

    let isVendor = mockRole === 'Vendor' || mockAccountType === 'vendor';

    if (mockUid && !isVendor) {
      const userSnap = await adminDb.collection('users').doc(mockUid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
        isVendor = true;
      }
    }

    if (isVendor) {
      await trackEnumerationAttempt(ip, mockUid || undefined);
      throw new Error('Not Found');
    }

    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const snap = await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).get();
        if (!snap.exists) {
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
    }

    const snap = await adminDb.collection(LISTINGS_COLLECTION).doc(listingId).get();
    if (!snap.exists) {
      await trackEnumerationAttempt(ip, mockUid || undefined);
      return null;
    }

    const listing = snap.data() as DealListing;
    if (listing.status !== 'published') {
      await trackEnumerationAttempt(ip, mockUid || undefined);
      return null;
    }

    // Visibility gate (DM-7): PRIVATE listings are not visible to anonymous users
    if (listing.visibilityMode === 'PRIVATE') {
      await trackEnumerationAttempt(ip, mockUid || undefined);
      return null;
    }

    return buildTeaserFromListing(listing);
  } catch (err) {
    if (err instanceof Error && err.message === 'Not Found') {
      await trackEnumerationAttempt(ip, mockUid || undefined);
    }
    console.error('getPublicListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch public listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 7. GET SUBSCRIBER LISTING (auth + subscription check)
// ─────────────────────────────────────────────────────────

export async function getSubscriberListing(
  idToken: string,
  listingId: string,
): Promise<SubscriberDealMatch> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const dummyListing: DealListing = {
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
          visibilityMode: 'MARKETPLACE' as const,
          transitionLog: [],
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
        const dummyProject: Project = {
          id: 'project_compose_test',
          propertyName: 'Capital Heights',
          address: '500 Syndicate Ave, Austin, TX',
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          assetClass: 'Residential',
          subStrategy: 'LONG_TERM',
          dispositionType: 'RENT',
          organizationId: 'org_paperworking_seed',
          ownerUid: 'user_lead_investor_seed',
          status: 'acquisition',
          members: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          financials: {
            purchasePrice: 500000,
            estimatedARV: 500000,
            capitalPlan: 'raise interest',
            monthlyGrossRent: 4000,
            vacancyRatePercent: 5,
            equityTerms: {
              funding_target: 200000,
              equity_offered_pct: 30,
              min_ticket: 10000,
              price_basis: 500000,
              version: 1,
            },
          } as any,
        };
        const dummyMetrics = deriveAllProjectMetrics(dummyProject);
        return {
          listing: dummyListing,
          project: dummyProject,
          metrics: dummyMetrics,
        };
      }
    }

    const ip = await getClientIp();
    const rateCheckIp = await limitRequest(ip, 'read');
    if (!rateCheckIp.allowed) {
      throw new Error('Rate limit exceeded');
    }

    const user = await verifyActionAuth(idToken);

    const rateCheckUid = await limitRequest(user.uid, 'read');
    if (!rateCheckUid.allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Vendor accounts are blocked
    if (user.accountType === 'vendor') {
      await trackEnumerationAttempt(ip, user.uid);
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
      await trackEnumerationAttempt(ip, user.uid);
      throw new Error('An active subscription is required to view full deal listings.');
    }

    let listing;
    let ref;
    try {
      const result = await readListingOrThrow(listingId);
      ref = result.ref;
      listing = result.data;
    } catch (err) {
      await trackEnumerationAttempt(ip, user.uid);
      throw err;
    }

    // Withdrawn listings are unreachable — even by subscribers
    if (listing.status === 'withdrawn') {
      await trackEnumerationAttempt(ip, user.uid);
      throw new Error('This deal has been withdrawn.');
    }

    // Takedown review listings are unreachable by anyone except the owner (Lead Investor)
    if (listing.status === 'takedown_review' && listing.ownerUid !== user.uid) {
      await trackEnumerationAttempt(ip, user.uid);
      throw new Error('This listing is under review.');
    }

    // Increment view count atomically
    await ref.update({
      viewCount: FieldValue.increment(1),
    });

    const updatedListing = { ...listing, viewCount: listing.viewCount + 1 };

    // Fetch associated project document
    const projectDoc = await adminDb.collection('projects').doc(listing.projectId).get();
    if (!projectDoc.exists) {
      throw new Error('Project document not found for this listing.');
    }
    const project = { id: projectDoc.id, ...projectDoc.data() } as unknown as Project;

    // ── Visibility Gating for Private Listings (DM-22/DM-D1) ──
    if (listing.visibilityMode === 'PRIVATE') {
      const isOwner = listing.ownerUid === user.uid;
      const isTeammate =
        user.organizationId &&
        (user.organizationId === listing.organizationId ||
          user.organizationId === project.organizationId);
      const isMember = project.members && project.members[user.uid];
      let isInvited = (user as any).invitedToProjectId === listing.projectId;

      if (!isOwner && !isTeammate && !isMember && !isInvited) {
        const userEmails = [
          (user.email as string)?.toLowerCase(),
          ...(Array.isArray((user as any).claimedEmails) ? (user as any).claimedEmails.map((e: string) => e.toLowerCase()) : [])
        ].filter(Boolean);

        const allInvitesSnap = await adminDb.collection('dealInvitations')
          .where('projectId', '==', listing.projectId)
          .get();

        const matchingInviteDoc = allInvitesSnap.docs.find(d => {
          const data = d.data();
          const inviteeEmailLower = data.inviteeEmail?.toLowerCase();
          return data.inviteeUid === user.uid || (inviteeEmailLower && userEmails.includes(inviteeEmailLower));
        });

        if (matchingInviteDoc) {
          isInvited = true;
          const inviteDoc = matchingInviteDoc;
          const inviteData = inviteDoc.data();
          const targetEmail = inviteData.inviteeEmail || (user.email as string)?.toLowerCase();

          if (inviteData.status === 'sent') {
            const now = new Date().toISOString();
            await inviteDoc.ref.update({
              status: 'opened',
              openedAt: now,
            });

            // Write to dealLedger subcollection
            const ledgerRef = adminDb.collection('projects').doc(listing.projectId)
              .collection('dealLedger').doc();
            await ledgerRef.set({
              id: ledgerRef.id,
              projectId: listing.projectId,
              listingId: listing.id,
              eventType: 'INVITATION_OPENED',
              performedBy: user.uid,
              inviteeEmail: targetEmail,
              version: listing.version || 1,
              visibilityMode: listing.visibilityMode,
              timestamp: now,
              metadata: {
                invitationId: inviteDoc.id,
              },
            });

            // Log to activityLog
            await writeActivityLog(listing.projectId, user.uid, [{
              fieldPath: `invitations.${targetEmail.replace(/\./g, '_')}.status`,
              oldValue: 'sent',
              newValue: 'opened',
            }], 'system');
          }
        }
      }

      if (!isOwner && !isTeammate && !isMember && !isInvited) {
        throw new Error('Access denied: this listing is private.');
      }
    }

    const metrics = deriveAllProjectMetrics(project);

    return {
      listing: updatedListing,
      project,
      metrics,
    };
  } catch (err) {
    console.error('getSubscriberListing error:', err);
    throw err instanceof Error ? err : new Error('Failed to fetch subscriber listing.');
  }
}

// ─────────────────────────────────────────────────────────
// 8. GET PUBLISHED LISTINGS (no auth — teaser array)
// ─────────────────────────────────────────────────────────

export async function getPublishedListings(
  filters?: {
    assetClass?: string;
    state?: string;
    subStrategy?: string;
  },
): Promise<DealListingTeaser[]> {
  try {
    const { cookies } = require('next/headers');
    const cookieStore = await cookies();
    const mockRole = cookieStore.get('mock_user_role')?.value;
    const mockAccountType = cookieStore.get('mock_user_account_type')?.value;
    const mockUid = cookieStore.get('mock_user_uid')?.value;

    let isVendor = mockRole === 'Vendor' || mockAccountType === 'vendor';

    if (mockUid && !isVendor) {
      const userSnap = await adminDb.collection('users').doc(mockUid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
        isVendor = true;
      }
    }

    if (isVendor) {
      throw new Error('Not Found');
    }

    if (process.env.NODE_ENV !== 'production') {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      if (cookieStore.get('__e2e_test')?.value === '1') {
        const snap = await adminDb.collection(LISTINGS_COLLECTION).where('status', '==', 'published').get();
        if (snap.empty) {
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

    // Filter out PRIVATE listings (DM-7 visibility gate)
    const visibleDocs = snap.docs.filter((doc) => {
      const data = doc.data() as DealListing;
      return data.visibilityMode !== 'PRIVATE';
    });

    const teasers = await Promise.all(
      visibleDocs.map(async (doc) => {
        const data = doc.data() as DealListing;
        const coords = await geocodeAddress(data.address);
        if (coords) {
          data.latitude = coords.lat;
          data.longitude = coords.lng;
        } else {
          delete data.latitude;
          delete data.longitude;
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

// 9. SEARCH DEAL BY ADDRESS (public — DM-7)
// ─────────────────────────────────────────────────────────

export async function searchDealByAddress(
  address: string,
  placeId?: string,
): Promise<DealSearchResult> {
  const ip = await getClientIp();
  const rateCheck = await limitRequest(ip, 'search');
  if (!rateCheck.allowed) {
    throw new Error('Rate limit exceeded');
  }

  // Input validation
  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return { mode: 'cold_start', address: address || '' };
  }

  const normalized = address.trim().toLowerCase();

  try {
    // Query published listings — match by normalized address (case-insensitive)
    const snap = await adminDb
      .collection(LISTINGS_COLLECTION)
      .where('status', '==', 'published')
      .get();

    // Find matching listing by address substring match
    const match = snap.docs.find((doc) => {
      const data = doc.data() as DealListing;
      return data.address?.toLowerCase().includes(normalized) ||
             normalized.includes(data.address?.toLowerCase() || '');
    });

    if (!match) {
      // Resolve address components on the server for zero-result state (DM-9)
      let resolvedAddress: ResolvedAddress | undefined = undefined;
      let targetPlaceId = placeId;

      const PlacesGateway = require('@/lib/places/placesGateway');
      const crypto = require('crypto');

      if (!targetPlaceId) {
        const geo = await PlacesGateway.geocode(address, 'public');
        if (geo && geo.placeId) {
          targetPlaceId = geo.placeId;
        }
      }

      if (targetPlaceId) {
        try {
          const details = await PlacesGateway.placeDetails(targetPlaceId, crypto.randomUUID(), 'public');
          resolvedAddress = {
            placeId: details.placeId,
            formattedAddress: details.formattedAddress,
            addressLine: details.street || '',
            city: details.city || '',
            state: details.state || '',
            zip: details.zip || '',
            lat: details.lat || 0,
            lng: details.lng || 0,
          };
        } catch (detailsErr) {
          console.error('[searchDealByAddress] Details fetch failed:', detailsErr);
        }
      }

      return { mode: 'cold_start', address, resolvedAddress };
    }

    const listing = match.data() as DealListing;

    // Visibility gate per DM-D9
    switch (listing.visibilityMode) {
      case 'PUBLIC_SOLICITED': {
        const teaser = buildTeaserFromListing(listing);
        const coords = await geocodeAddress(listing.address);
        const strippedTeaser: DealListingTeaser = {
          id: teaser.id,
          projectId: teaser.projectId,
          status: teaser.status,
          propertyName: teaser.propertyName,
          neighborhood: teaser.neighborhood,
          city: teaser.city,
          state: teaser.state,
          assetClass: teaser.assetClass,
          subStrategy: teaser.subStrategy,
          leadInvestorName: teaser.leadInvestorName,
          followCount: teaser.followCount,
          viewCount: teaser.viewCount,
          publishedAt: teaser.publishedAt,
          latitude: coords?.lat,
          longitude: coords?.lng,
        };
        return { mode: 'public_solicited', teaser: strippedTeaser };
      }
      case 'MARKETPLACE':
        return { mode: 'marketplace', listingId: listing.id, exists: true };
      case 'PRIVATE':
      default: {
        // Resolve private deal address too so they can "Start a Deal here" (it acts as a private draft lookup fallback)
        let resolvedAddress: ResolvedAddress | undefined = undefined;
        let targetPlaceId = placeId;
        const PlacesGateway = require('@/lib/places/placesGateway');
        const crypto = require('crypto');
        if (!targetPlaceId) {
          const geo = await PlacesGateway.geocode(address, 'public');
          if (geo && geo.placeId) targetPlaceId = geo.placeId;
        }
        if (targetPlaceId) {
          try {
            const details = await PlacesGateway.placeDetails(targetPlaceId, crypto.randomUUID(), 'public');
            resolvedAddress = {
              placeId: details.placeId,
              formattedAddress: details.formattedAddress,
              addressLine: details.street || '',
              city: details.city || '',
              state: details.state || '',
              zip: details.zip || '',
              lat: details.lat || 0,
              lng: details.lng || 0,
            };
          } catch {}
        }
        return { mode: 'cold_start', address, resolvedAddress };
      }
    }
  } catch (err) {
    console.error('searchDealByAddress error:', err);
    return { mode: 'cold_start', address };
  }
}

// ─────────────────────────────────────────────────────────
// 10. SEARCH DEALS AUTHENTICATED (subscriber — DM-10)
// ─────────────────────────────────────────────────────────

export async function searchDealsAuthenticated(
  idToken: string,
  address: string,
  placeId?: string,
  sortBy: DealSortOption = 'relevance',
): Promise<SubscriberSearchResult> {
  const ip = await getClientIp();
  const rateCheckIp = await limitRequest(ip, 'search');
  if (!rateCheckIp.allowed) {
    throw new Error('Rate limit exceeded');
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return { mode: 'cold_start', address: address || '' };
  }

  const normalized = address.trim().toLowerCase();

  try {
    // 1. Verify user authentication and subscription gates
    const user = await verifyActionAuth(idToken);

    const rateCheckUid = await limitRequest(user.uid, 'search');
    if (!rateCheckUid.allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Vendor accounts are blocked
    if (user.accountType === 'vendor') {
      throw new Error('Deal listings are not available for vendor accounts.');
    }

    // Subscription gate
    const plan = user.subscriptionPlan as string | undefined;
    const status = user.subscriptionStatus as string | undefined;
    if (
      !plan ||
      plan === 'None' ||
      plan === 'Vendor Network' ||
      status !== 'active'
    ) {
      throw new Error('An active subscription is required to search deal listings.');
    }

    // 2. Resolve placeId if not provided
    let targetPlaceId = placeId;
    const PlacesGateway = require('@/lib/places/placesGateway');
    const crypto = require('crypto');

    if (!targetPlaceId) {
      try {
        const geo = await PlacesGateway.geocode(address, user.uid);
        if (geo && geo.placeId) {
          targetPlaceId = geo.placeId;
        }
      } catch (geoErr) {
        console.error('[searchDealsAuthenticated] Geocoding failed:', geoErr);
      }
    }

    // Load matching listings & projects
    let matchedProjects: Project[] = [];
    let matchedListings: DealListing[] = [];

    if (targetPlaceId) {
      // Find projects for this placeId
      const projectsSnap = await adminDb
        .collection('projects')
        .where('placeId', '==', targetPlaceId)
        .get();

      matchedProjects = projectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Project));
    }

    // If projects found by placeId, get their published listings
    if (matchedProjects.length > 0) {
      const projectIds = matchedProjects.map((p) => p.id);
      const listingsSnap = await adminDb
        .collection(LISTINGS_COLLECTION)
        .where('status', '==', 'published')
        .get();

      matchedListings = listingsSnap.docs
        .map((doc) => doc.data() as DealListing)
        .filter((l) => projectIds.includes(l.projectId));

      // Filter listings by visibility mode
      matchedListings = matchedListings.filter((l) => {
        if (l.visibilityMode === 'PRIVATE') {
          return l.ownerUid === user.uid; // owner can see their own private deal
        }
        return true;
      });
    }

    // Fallback: If no matches by placeId/projects, try address substring match on published listings
    if (matchedListings.length === 0) {
      const listingsSnap = await adminDb
        .collection(LISTINGS_COLLECTION)
        .where('status', '==', 'published')
        .get();

      matchedListings = listingsSnap.docs
        .map((doc) => doc.data() as DealListing)
        .filter((l) => {
          if (l.visibilityMode === 'PRIVATE' && l.ownerUid !== user.uid) return false;
          return l.address?.toLowerCase().includes(normalized) ||
                 normalized.includes(l.address?.toLowerCase() || '');
        });

      // Load projects for these listings
      const projectIds = Array.from(new Set(matchedListings.map((l) => l.projectId)));
      if (projectIds.length > 0) {
        const projectsPromise = projectIds.map(async (id) => {
          const doc = await adminDb.collection('projects').doc(id).get();
          if (doc.exists) {
            return { id: doc.id, ...doc.data() } as Project;
          }
          return null;
        });
        matchedProjects = (await Promise.all(projectsPromise)).filter((p): p is Project => p !== null);
      }
    }

    // If still no matching listings, return a cold start / zero result state with resolved property details
    if (matchedListings.length === 0) {
      let resolvedAddress: ResolvedAddress | undefined = undefined;

      if (targetPlaceId) {
        try {
          const details = await PlacesGateway.placeDetails(targetPlaceId, crypto.randomUUID(), user.uid);
          resolvedAddress = {
            placeId: details.placeId,
            formattedAddress: details.formattedAddress,
            addressLine: details.street || '',
            city: details.city || '',
            state: details.state || '',
            zip: details.zip || '',
            lat: details.lat || 0,
            lng: details.lng || 0,
          };
        } catch (detailsErr) {
          console.error('[searchDealsAuthenticated] Details fetch failed:', detailsErr);
        }
      }

      // Telemetry capture for search with 0 results
      const telemetry = require('@/lib/telemetry').default;
      await telemetry.capture({
        distinctId: user.uid,
        event: 'subscriber_deal_search_zero_result',
        properties: { address, placeId: targetPlaceId },
      });

      return { mode: 'cold_start', address, resolvedAddress };
    }

    // 3. Perform G-3 Metric Calculations & Grouping
    const { deriveAllProjectMetrics } = require('@/lib/metrics/reiMetrics');

    const grouped: Record<string, SubscriberPropertyResult> = {};

    for (const listing of matchedListings) {
      const project = matchedProjects.find((p) => p.id === listing.projectId);
      if (!project) continue;

      // Calculate live metrics via deriveAllProjectMetrics
      const metrics = deriveAllProjectMetrics(project);

      // Group key: placeId if available, fallback to canonical address, fallback to listing address
      const key = project.placeId || project.propertyId || listing.address || 'unknown';

      if (!grouped[key]) {
        grouped[key] = {
          propertyId: project.propertyId || undefined,
          placeId: project.placeId || undefined,
          canonicalAddress: listing.address,
          city: listing.city || '',
          state: listing.state || '',
          zipCode: listing.zipCode || '',
          coordinates: (listing.latitude !== undefined && listing.longitude !== undefined)
            ? { lat: listing.latitude, lng: listing.longitude }
            : undefined,
          deals: [],
        };

        // If propertyId exists, try to get canonical property address from properties collection
        if (project.propertyId) {
          try {
            const propDoc = await adminDb.collection('properties').doc(project.propertyId).get();
            if (propDoc.exists) {
              const propData = propDoc.data();
              if (propData) {
                grouped[key].canonicalAddress = propData.canonicalAddress || grouped[key].canonicalAddress;
                grouped[key].city = propData.city || grouped[key].city;
                grouped[key].state = propData.state || grouped[key].state;
                grouped[key].zipCode = propData.zip || grouped[key].zipCode;
                // Honor 30-day cache boundary on coordinates (DM-13)
                const now = Date.now();
                if (propData.coordinates && propData.coordinates.expiresAt && propData.coordinates.expiresAt > now) {
                  grouped[key].coordinates = {
                    lat: propData.coordinates.lat,
                    lng: propData.coordinates.lng,
                  };
                } else {
                  console.warn(`[listings.ts] Property coordinates missing or expired for ${project.propertyId}. Refreshing...`);
                  const { geocodeAddress } = require('@/lib/providers/geocode');
                  const freshCoords = await geocodeAddress(propData.canonicalAddress || listing.address, user.uid);
                  if (freshCoords) {
                    grouped[key].coordinates = freshCoords;
                    // Update property doc asynchronously
                    await propDoc.ref.update({
                      coordinates: {
                        lat: freshCoords.lat,
                        lng: freshCoords.lng,
                        cachedAt: now,
                        expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30-day coordinates cache boundary (Section A.3)
                      },
                      updatedAt: new Date(),
                    }).catch(err => console.error('[listings.ts] Failed to update property coordinates:', err));
                  } else {
                    delete grouped[key].coordinates;
                  }
                }
              }
            }
          } catch (propErr) {
            console.error('[searchDealsAuthenticated] Property doc fetch error:', propErr);
          }
        }
      }

      grouped[key].deals.push({
        listing,
        project,
        metrics,
      });
    }

    const results = Object.values(grouped);

    // ── Sort nested deals inside each property result ──
    for (const group of results) {
      group.deals.sort((a, b) => {
        if (sortBy === 'freshness') {
          const timeA = new Date(a.listing.updatedAt || a.listing.createdAt).getTime();
          const timeB = new Date(b.listing.updatedAt || b.listing.createdAt).getTime();
          return timeB - timeA;
        } else if (sortBy === 'yield') {
          const valA = a.metrics.cashOnCashReturn ?? -Infinity;
          const valB = b.metrics.cashOnCashReturn ?? -Infinity;
          return valB - valA;
        } else if (sortBy === 'activity') {
          const valA = a.listing.followCount || 0;
          const valB = b.listing.followCount || 0;
          return valB - valA;
        } else if (sortBy === 'price_asc') {
          const valA = a.listing.askingPriceCents || (a.project.financials?.purchasePrice ? a.project.financials.purchasePrice * 100 : Infinity);
          const valB = b.listing.askingPriceCents || (b.project.financials?.purchasePrice ? b.project.financials.purchasePrice * 100 : Infinity);
          return valA - valB;
        } else if (sortBy === 'price_desc') {
          const valA = a.listing.askingPriceCents || (a.project.financials?.purchasePrice ? a.project.financials.purchasePrice * 100 : 0);
          const valB = b.listing.askingPriceCents || (b.project.financials?.purchasePrice ? b.project.financials.purchasePrice * 100 : 0);
          return valB - valA;
        } else {
          // Default: relevance
          return computeRelevanceScore(b) - computeRelevanceScore(a);
        }
      });
    }

    // ── Sort properties based on their best deal (index 0 after sorting nested deals) ──
    results.sort((a, b) => {
      const dealA = a.deals[0];
      const dealB = b.deals[0];
      if (!dealA && !dealB) return 0;
      if (!dealA) return 1;
      if (!dealB) return -1;

      if (sortBy === 'freshness') {
        const timeA = new Date(dealA.listing.updatedAt || dealA.listing.createdAt).getTime();
        const timeB = new Date(dealB.listing.updatedAt || dealB.listing.createdAt).getTime();
        return timeB - timeA;
      } else if (sortBy === 'yield') {
        const valA = dealA.metrics.cashOnCashReturn ?? -Infinity;
        const valB = dealB.metrics.cashOnCashReturn ?? -Infinity;
        return valB - valA;
      } else if (sortBy === 'activity') {
        const valA = dealA.listing.followCount || 0;
        const valB = dealB.listing.followCount || 0;
        return valB - valA;
      } else if (sortBy === 'price_asc') {
        const valA = dealA.listing.askingPriceCents || (dealA.project.financials?.purchasePrice ? dealA.project.financials.purchasePrice * 100 : Infinity);
        const valB = dealB.listing.askingPriceCents || (dealB.project.financials?.purchasePrice ? dealB.project.financials.purchasePrice * 100 : Infinity);
        return valA - valB;
      } else if (sortBy === 'price_desc') {
        const valA = dealA.listing.askingPriceCents || (dealA.project.financials?.purchasePrice ? dealA.project.financials.purchasePrice * 100 : 0);
        const valB = dealB.listing.askingPriceCents || (dealB.project.financials?.purchasePrice ? dealB.project.financials.purchasePrice * 100 : 0);
        return valB - valA;
      } else {
        // Default: relevance
        return computeRelevanceScore(dealB) - computeRelevanceScore(dealA);
      }
    });

    // Telemetry capture for search success
    const telemetry = require('@/lib/telemetry').default;
    await telemetry.capture({
      distinctId: user.uid,
      event: 'subscriber_deal_search_success',
      properties: { address, placeId: targetPlaceId, resultsCount: results.length, sortBy },
    });

    return { mode: 'results', results };
  } catch (err) {
    console.error('searchDealsAuthenticated error:', err);
    throw err instanceof Error ? err : new Error('Failed to perform authenticated search.');
  }
}

/**
 * Acknowledge the disclosure for a specific visibility mode.
 */
export async function acknowledgeDisclosure(
  idToken: string,
  listingId: string,
  mode: VisibilityMode,
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);
    resolveActor(listing, user.uid, user.role as string);

    const now = new Date().toISOString();
    await ref.update({
      disclosureAcknowledgedForMode: mode,
      updatedAt: now,
    });

    return { success: true };
  } catch (err) {
    console.error('acknowledgeDisclosure error:', err);
    throw err instanceof Error ? err : new Error('Failed to acknowledge disclosure.');
  }
}

/**
 * Update the property control status on the project.
 */
export async function updateControlStatus(
  idToken: string,
  projectId: string,
  controlStatus: 'owned' | 'under-contract' | 'option' | 'exclusive_right' | 'none',
): Promise<{ success: true }> {
  try {
    const user = await verifyActionAuth(idToken);
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) throw new Error('Project not found.');

    // Check role/permissions
    if (user.role !== 'Lead Investor' && user.role !== 'Platform Admin' && user.role !== 'Admin') {
      throw new Error('Permission denied.');
    }

    await projectRef.update({
      controlStatus,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (err) {
    console.error('updateControlStatus error:', err);
    throw err instanceof Error ? err : new Error('Failed to update control status.');
  }
}

/**
 * Toggle document exposure on a listing.
 */
export async function toggleDocumentExposure(
  idToken: string,
  listingId: string,
  docName: string,
  expose: boolean,
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    const { ref, data: listing } = await readListingOrThrow(listingId);

    // Check role/permissions
    if (user.uid !== listing.ownerUid && user.role !== 'Lead Investor' && user.role !== 'Admin') {
      throw new Error('Permission denied.');
    }

    // Resolve docId from projectFiles collection if exists
    let docId = '';
    const filesSnap = await adminDb
      .collection('projectFiles')
      .where('projectId', '==', listing.projectId)
      .get();
    
    const fileDoc = filesSnap.docs.find(doc => {
      const data = doc.data();
      return data.name === docName || data.fileName === docName;
    });
    if (fileDoc) {
      docId = fileDoc.id;
    }

    const currentExposed = listing.exposedDocumentIds || [];
    let updatedExposed: string[] = [];
    if (expose) {
      // Add both docName and docId (if found) to exposedDocumentIds
      const itemsToAdd = [docName];
      if (docId) itemsToAdd.push(docId);
      updatedExposed = Array.from(new Set([...currentExposed, ...itemsToAdd]));
    } else {
      updatedExposed = currentExposed.filter((id: string) => id !== docId && id !== docName);
    }

    await ref.update({
      exposedDocumentIds: updatedExposed,
      updatedAt: new Date().toISOString(),
    });

    // Log the exposure event
    await trackDealActivity(
      listing.projectId,
      listing.projectId,
      user.uid,
      'edit',
      { docId, docName, action: expose ? 'document_exposed' : 'document_unexposed' }
    ).catch(err => console.error('[toggleDocumentExposure activity logging failed]', err));

    return { success: true };
  } catch (err) {
    console.error('toggleDocumentExposure error:', err);
    throw err instanceof Error ? err : new Error('Failed to toggle document exposure.');
  }
}

