"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import { NotificationService } from '@/lib/services/notificationService';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import type { UserProfile } from '@/types/user';

/* ═══════════════════════════════════════════════════════
   Card F4.3 — RFP & Bids Server Actions

   Slot-scoped RFP dispatch and bid acceptance.
   Sub-collection: projects/{projectId}/rfpBids/{bidId}
   
   Reuses the existing vendorAssignment pipeline:
   - vendorAssignments (project-level)
   - vendorRequests (project-level, for vendor portal)
   - vendorInbox (user-level, for vendor's inbox)
   ═══════════════════════════════════════════════════════ */

// ── Valid F4 slot keys ─────────────────────────────────────────────────────
const VALID_SLOT_KEYS = [
  'f4TitleEscrowVendor',
  'f4ClosingAttorneyVendor',
  'f4AppraiserVendor',
  'f4EnvironmentalVendor',
  'f4SurveyorVendor',
  'f4InsuranceBrokerVendor',
  'f4CdcVendor',
  'f4HardMoneyLenderVendor',
] as const;

type SlotKey = typeof VALID_SLOT_KEYS[number];

const SLOT_LABELS: Record<string, string> = {
  f4TitleEscrowVendor: 'Title / Escrow',
  f4ClosingAttorneyVendor: 'Closing Attorney',
  f4AppraiserVendor: 'Appraiser',
  f4EnvironmentalVendor: 'Environmental Consultant',
  f4SurveyorVendor: 'Surveyor',
  f4InsuranceBrokerVendor: 'Insurance Broker',
  f4CdcVendor: 'CDC (SBA 504)',
  f4HardMoneyLenderVendor: 'Private / Hard-Money Lender',
};

// ── Auth helper ────────────────────────────────────────────────────────────
interface VerifiedUser {
  uid: string;
  displayName: string;
  email: string;
  organizationId: string;
  personalOrganizationId: string;
  memberships?: Record<string, unknown>;
  membershipScopes?: Record<string, { isScoped: boolean; scopedProjectIds: string[] }>;
  [key: string]: unknown;
}

async function verifyAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  const decoded = await adminAuth.verifyIdToken(idToken);
  const snap = await adminDb.collection('users').doc(decoded.uid).get();
  if (!snap.exists) throw new Error('User profile not found.');
  return { uid: decoded.uid, ...snap.data() } as VerifiedUser;
}

function hasProjectAccess(
  profile: VerifiedUser,
  targetOrgId: string | undefined,
  projectId?: string
): boolean {
  if (!targetOrgId) return false;
  const orgMember =
    profile.personalOrganizationId === targetOrgId ||
    profile.organizationId === targetOrgId ||
    (profile.memberships != null && Boolean(profile.memberships[targetOrgId]));
  if (!orgMember) return false;
  if (projectId && profile.membershipScopes) {
    const scope = profile.membershipScopes[targetOrgId];
    if (scope?.isScoped) {
      return Array.isArray(scope.scopedProjectIds) && scope.scopedProjectIds.includes(projectId);
    }
  }
  return true;
}

/** Generate a short unique ID for RFP grouping */
function generateRfpId(): string {
  return `rfp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ──────────────────────────────────────────────────────
   1. ISSUE SLOT RFP
   Dispatches an RFP to multiple vendors for a specific
   F4 team slot. Creates vendorAssignment + rfpBid docs
   for each vendor.
   ────────────────────────────────────────────────────── */
export async function issueSlotRfp(
  idToken: string,
  projectId: string,
  slotKey: string,
  vendorUids: string[],
  message?: string,
  urgency?: 'standard' | 'rush' | 'asap',
  desiredTimeline?: string
): Promise<{ success: boolean; rfpId?: string; bidIds?: string[]; error?: string }> {
  try {
    // ── Validate inputs ──────────────────────────────────────────────────
    if (!VALID_SLOT_KEYS.includes(slotKey as SlotKey)) {
      return { success: false, error: `Invalid slot key: ${slotKey}` };
    }

    if (!vendorUids || vendorUids.length === 0) {
      return { success: false, error: 'At least one vendor is required.' };
    }

    if (vendorUids.length > 10) {
      return { success: false, error: 'Maximum 10 vendors per RFP.' };
    }

    // ── Auth & access ────────────────────────────────────────────────────
    const user = await verifyAuth(idToken);
    const hasActiveSub = isSubscriptionActive(user as unknown as UserProfile);
    if (!hasActiveSub) {
      return { success: false, error: 'An active subscription is required.' };
    }

    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data()!;

    if (!hasProjectAccess(user, projectData.organizationId, projectId)) {
      return { success: false, error: 'Access denied.' };
    }

    // ── Generate shared RFP ID ───────────────────────────────────────────
    const rfpId = generateRfpId();
    const slotLabel = SLOT_LABELS[slotKey] || slotKey;
    const serviceType = slotLabel;
    const actorName = user.displayName || user.email || 'Investor';
    const dealAddress = projectData.propertyName || projectData.address?.street || 'the project';
    const bidIds: string[] = [];

    // ── Create assignment + bid for each vendor ──────────────────────────
    const batch = adminDb.batch();

    for (const vendorUid of vendorUids) {
      // Verify vendor exists
      const vendorSnap = await adminDb.collection('users').doc(vendorUid).get();
      if (!vendorSnap.exists) continue;

      const vendorData = vendorSnap.data()!;
      const vendorProfile = vendorData.vendorProfile || vendorData;
      const vendorName = vendorProfile.companyName || vendorData.displayName || 'Unknown Vendor';

      // 1. Create vendorAssignment doc
      const assignmentRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('vendorAssignments')
        .doc();

      const assignmentId = assignmentRef.id;

      batch.set(assignmentRef, {
        id: assignmentId,
        projectId,
        vendorId: vendorUid,
        vendorName,
        vendorCompanyName: vendorName,
        serviceType,
        requestedBy: user.uid,
        requestedByName: actorName,
        status: 'PENDING',
        message: message?.trim() || null,
        urgency: urgency ?? 'standard',
        desiredTimeline: desiredTimeline?.trim() || null,
        rfpId, // tag so we can group them
        slotKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2. Create vendorInbox entry
      const inboxRef = adminDb
        .collection('users')
        .doc(vendorUid)
        .collection('vendorInbox')
        .doc(assignmentId);

      batch.set(inboxRef, {
        assignmentId,
        projectId,
        projectName: projectData.propertyName || dealAddress,
        projectAddress: projectData.address?.street || 'N/A',
        investorId: user.uid,
        investorName: actorName,
        serviceType,
        message: message?.trim() || null,
        urgency: urgency ?? 'standard',
        desiredTimeline: desiredTimeline?.trim() || null,
        status: 'PENDING',
        rfpId,
        slotKey,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 3. Create vendorRequest (for vendor portal collection group)
      const requestRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('vendorRequests')
        .doc(assignmentId);

      batch.set(requestRef, {
        id: assignmentId,
        projectId,
        vendorUid,
        serviceType,
        type: serviceType,
        message: message?.trim() || null,
        urgency: urgency ?? 'standard',
        desiredTimeline: desiredTimeline?.trim() || null,
        status: 'PENDING',
        requestedAt: FieldValue.serverTimestamp(),
        requestedBy: user.uid,
        requestedByName: actorName,
        rfpId,
        slotKey,
      });

      // 4. Create rfpBid doc (new for F4.3)
      const bidRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('rfpBids')
        .doc();

      const bidId = bidRef.id;
      bidIds.push(bidId);

      batch.set(bidRef, {
        id: bidId,
        rfpId,
        slotKey,
        vendorUid,
        vendorName,
        vendorCompanyName: vendorName,
        price: null,
        turnaroundDays: null,
        notes: '',
        status: 'PENDING',
        assignmentId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // ── Notifications (non-blocking) ─────────────────────────────────────
    for (const vendorUid of vendorUids) {
      NotificationService.createNotification({
        type: 'VENDOR_LEAD',
        recipientId: vendorUid,
        actor: { uid: user.uid, name: actorName },
        objectReference: {
          projectId,
          task: `RFP: ${slotLabel}`,
          dealAddress,
        },
        deepLinkUrl: `/dashboard/inbox`,
      }).catch((err) => {
        console.error('[RFP] Notification failed (non-critical):', err);
      });
    }

    // ── Timeline / Activity (non-blocking) ───────────────────────────────
    if (projectData.organizationId) {
      logOrgActivity({
        organizationId: projectData.organizationId,
        type: 'phase_change',
        actorId: user.uid,
        actorName,
        summary: `Issued RFP for ${slotLabel} to ${vendorUids.length} vendor${vendorUids.length > 1 ? 's' : ''}`,
        projectId,
        projectName: projectData.propertyName || dealAddress,
      });
    }

    writeActivityLog(projectId, user.uid, [{
      fieldPath: `rfp.${slotKey}`,
      oldValue: null,
      newValue: `RFP issued to ${vendorUids.length} vendor(s)`,
    }], 'manual').catch(() => {});

    return { success: true, rfpId, bidIds };
  } catch (error: any) {
    console.error('[RFP] issueSlotRfp error:', error);
    if (error.message === 'Missing authentication token.' || error.message === 'User profile not found.') {
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    return { success: false, error: 'Failed to issue RFP.' };
  }
}

/* ──────────────────────────────────────────────────────
   2. ACCEPT SLOT BID
   Assigns the winning vendor to the F4 team slot,
   cancels all other bids in the same rfpId group.
   ────────────────────────────────────────────────────── */
export async function acceptSlotBid(
  idToken: string,
  projectId: string,
  bidId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await verifyAuth(idToken);

    // ── Fetch bid ────────────────────────────────────────────────────────
    const bidRef = adminDb.collection('projects').doc(projectId).collection('rfpBids').doc(bidId);
    const bidSnap = await bidRef.get();
    if (!bidSnap.exists) {
      return { success: false, error: 'Bid not found.' };
    }
    const bid = bidSnap.data()!;

    if (bid.status === 'ACCEPTED') {
      return { success: false, error: 'This bid has already been accepted.' };
    }
    if (bid.status === 'CANCELLED' || bid.status === 'DECLINED') {
      return { success: false, error: `Cannot accept a ${bid.status.toLowerCase()} bid.` };
    }

    // ── Verify project access ────────────────────────────────────────────
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data()!;

    if (!hasProjectAccess(user, projectData.organizationId, projectId)) {
      return { success: false, error: 'Access denied.' };
    }

    // ── Fetch vendor for structured assignment ───────────────────────────
    const vendorSnap = await adminDb.collection('users').doc(bid.vendorUid).get();
    const vendorData = vendorSnap.exists ? vendorSnap.data()! : {};
    const vendorProfile = vendorData.vendorProfile || vendorData;

    // ── Build F4VendorAssignment record ──────────────────────────────────
    const now = new Date().toISOString();
    const vendorRecord = {
      name: bid.vendorName || vendorProfile.companyName || 'Vendor',
      firm: bid.vendorCompanyName || null,
      phone: vendorProfile.phone || null,
      email: vendorData.email || null,
      source: 'marketplace' as const,
      marketplaceVendorId: bid.vendorUid,
      assignedAt: now,
      assignedBy: user.uid,
    };

    const batch = adminDb.batch();

    // 1. Assign F4 slot
    const slotKey = bid.slotKey;
    const updatePath = `financials.${slotKey}`;
    const projectRef = adminDb.collection('projects').doc(projectId);
    batch.update(projectRef, { [updatePath]: vendorRecord });

    // 2. Mark winning bid as ACCEPTED
    batch.update(bidRef, {
      status: 'ACCEPTED',
      acceptedAt: FieldValue.serverTimestamp(),
    });

    // 3. Mark winning assignment as ACCEPTED
    const assignmentRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorAssignments')
      .doc(bid.assignmentId);
    batch.update(assignmentRef, {
      status: 'ACCEPTED',
      updatedAt: FieldValue.serverTimestamp(),
      respondedAt: FieldValue.serverTimestamp(),
    });

    // 4. Cancel all other bids in the same rfpId
    const otherBidsSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('rfpBids')
      .where('rfpId', '==', bid.rfpId)
      .get();

    const cancelledVendorUids: string[] = [];

    for (const doc of otherBidsSnap.docs) {
      if (doc.id === bidId) continue;
      const otherBid = doc.data();
      if (otherBid.status === 'PENDING' || otherBid.status === 'QUOTED') {
        batch.update(doc.ref, { status: 'CANCELLED' });

        // Also cancel the linked assignment
        const otherAssignmentRef = adminDb
          .collection('projects')
          .doc(projectId)
          .collection('vendorAssignments')
          .doc(otherBid.assignmentId);
        batch.update(otherAssignmentRef, {
          status: 'CANCELLED',
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Update vendor inbox
        const otherInboxRef = adminDb
          .collection('users')
          .doc(otherBid.vendorUid)
          .collection('vendorInbox')
          .doc(otherBid.assignmentId);
        batch.update(otherInboxRef, { status: 'CANCELLED' });

        cancelledVendorUids.push(otherBid.vendorUid);
      }
    }

    await batch.commit();

    // ── Notifications ────────────────────────────────────────────────────
    const actorName = user.displayName || user.email || 'Investor';
    const slotLabel = SLOT_LABELS[slotKey] || slotKey;
    const dealAddress = projectData.propertyName || projectData.address?.street || 'the project';

    // Winner notification
    NotificationService.createNotification({
      type: 'VENDOR_BID',
      recipientId: bid.vendorUid,
      actor: { uid: user.uid, name: actorName },
      objectReference: {
        projectId,
        task: `Your bid for ${slotLabel} has been accepted`,
        dealAddress,
      },
      deepLinkUrl: `/dashboard/inbox`,
    }).catch(() => {});

    // Cancellation notifications
    for (const vendorUid of cancelledVendorUids) {
      NotificationService.createNotification({
        type: 'VENDOR_BID',
        recipientId: vendorUid,
        actor: { uid: user.uid, name: actorName },
        objectReference: {
          projectId,
          task: `RFP for ${slotLabel} — another vendor was selected`,
          dealAddress,
        },
        deepLinkUrl: `/dashboard/inbox`,
      }).catch(() => {});
    }

    // ── Timeline ─────────────────────────────────────────────────────────
    writeActivityLog(projectId, user.uid, [{
      fieldPath: `financials.${slotKey}`,
      oldValue: null,
      newValue: `${bid.vendorName} assigned as ${slotLabel} from RFP`,
    }], 'manual').catch(() => {});

    if (projectData.organizationId) {
      logOrgActivity({
        organizationId: projectData.organizationId,
        type: 'phase_change',
        actorId: user.uid,
        actorName,
        summary: `${bid.vendorName} assigned as ${slotLabel} from RFP`,
        projectId,
        projectName: projectData.propertyName || dealAddress,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('[RFP] acceptSlotBid error:', error);
    return { success: false, error: 'Failed to accept bid.' };
  }
}

/* ──────────────────────────────────────────────────────
   3. GET SLOT RFP BIDS
   Returns all rfpBid docs for a project, optionally
   filtered by slot key. Grouped by rfpId.
   ────────────────────────────────────────────────────── */
export async function getSlotRfpBids(
  idToken: string,
  projectId: string,
  slotKey?: string
): Promise<{ success: boolean; bids?: any[]; error?: string }> {
  try {
    const user = await verifyAuth(idToken);

    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data()!;

    if (!hasProjectAccess(user, projectData.organizationId, projectId)) {
      return { success: false, error: 'Access denied.' };
    }

    let ref: FirebaseFirestore.Query = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('rfpBids')
      .orderBy('createdAt', 'desc');

    if (slotKey && VALID_SLOT_KEYS.includes(slotKey as SlotKey)) {
      ref = ref.where('slotKey', '==', slotKey);
    }

    const snap = await ref.get();

    const bids = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        quotedAt: data.quotedAt?.toDate?.()?.toISOString() || null,
        acceptedAt: data.acceptedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return { success: true, bids };
  } catch (error: any) {
    console.error('[RFP] getSlotRfpBids error:', error);
    return { success: false, error: 'Failed to fetch bids.' };
  }
}
