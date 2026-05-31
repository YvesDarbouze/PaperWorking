"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import { NotificationService } from '@/lib/services/notificationService';
import type { UserProfile } from '@/types/user';
import type { AssignmentStatus } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Vendor Assignment Server Actions
   
   Full Firestore lifecycle for vendor assignments:
   projects/{projectId}/vendorAssignments/{assignmentId}
   ═══════════════════════════════════════════════════════ */

// ── Auth helper (mirrors actions/index.ts pattern) ──
interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  personalOrganizationId: string;
  displayName: string;
  email: string;
  memberships?: Record<string, unknown>;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) throw new Error('User profile not found in database.');

    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('[VendorAssignment] Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

// ── Project access check (mirrors API vendors/request pattern) ──
function hasProjectAccess(
  profile: VerifiedUser,
  targetOrgId: string | undefined
): boolean {
  if (!targetOrgId) return false;
  if (profile.personalOrganizationId === targetOrgId) return true;
  if (profile.organizationId === targetOrgId) return true;
  if (profile.memberships && profile.memberships[targetOrgId]) return true;
  return false;
}

/* ──────────────────────────────────────────────────────
   1. ASSIGN VENDOR TO PROJECT
   Creates a vendorAssignment doc on the project AND
   a vendorInbox entry for the vendor.
   ────────────────────────────────────────────────────── */
export async function assignVendorToProject(
  idToken: string,
  projectId: string,
  vendorUid: string,
  serviceType: string,
  message?: string
): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
  try {
    const user = await verifyActionAuth(idToken);

    // Verify subscription
    const hasActiveSub = isSubscriptionActive(user as unknown as UserProfile);
    if (!hasActiveSub) {
      return { success: false, error: 'An active subscription is required to assign vendors.' };
    }

    // Verify project exists and user has access
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data();

    if (!hasProjectAccess(user, projectData?.organizationId)) {
      return { success: false, error: 'Access denied for this project.' };
    }

    // Verify vendor exists
    const vendorSnap = await adminDb.collection('users').doc(vendorUid).get();
    if (!vendorSnap.exists) {
      return { success: false, error: 'Vendor not found.' };
    }
    const vendorData = vendorSnap.data();
    const vendorProfile = vendorData?.vendorProfile || vendorData;

    // Prevent duplicate pending assignments for same vendor + project + serviceType
    const existingQuery = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorAssignments')
      .where('vendorId', '==', vendorUid)
      .where('serviceType', '==', serviceType)
      .where('status', 'in', ['PENDING', 'ACCEPTED'])
      .get();

    if (!existingQuery.empty) {
      return { success: false, error: 'An active assignment already exists for this vendor and service type.' };
    }

    // Build assignment document
    const assignmentRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorAssignments')
      .doc();

    const assignmentId = assignmentRef.id;

    const assignmentData = {
      id: assignmentId,
      projectId,
      vendorId: vendorUid,
      vendorName: vendorProfile?.companyName || vendorData?.displayName || 'Unknown Vendor',
      vendorCompanyName: vendorProfile?.companyName || vendorData?.displayName || 'Unknown Vendor',
      serviceType,
      requestedBy: user.uid,
      requestedByName: user.displayName || user.email || 'Investor',
      status: 'PENDING' as AssignmentStatus,
      message: message?.trim() || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Write to both collections atomically
    const batch = adminDb.batch();

    // 1. Write vendorAssignment on the project
    batch.set(assignmentRef, assignmentData);

    // 2. Write vendorInbox entry for the vendor (for their inbox view)
    const inboxRef = adminDb
      .collection('users')
      .doc(vendorUid)
      .collection('vendorInbox')
      .doc(assignmentId);

    batch.set(inboxRef, {
      assignmentId,
      projectId,
      projectName: projectData?.propertyName || projectData?.address?.street || 'Untitled Project',
      projectAddress: projectData?.address?.street || 'N/A',
      investorId: user.uid,
      investorName: user.displayName || user.email || 'Investor',
      serviceType,
      message: message?.trim() || null,
      status: 'PENDING' as AssignmentStatus,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Send notification to the vendor (non-blocking)
    NotificationService.createNotification({
      type: 'VENDOR_LEAD',
      recipientId: vendorUid,
      actor: {
        uid: user.uid,
        name: user.displayName || user.email || 'An investor',
      },
      objectReference: {
        projectId,
        task: `${serviceType} Assignment`,
        dealAddress: projectData?.address?.street || 'a project',
      },
      deepLinkUrl: `/dashboard/inbox`,
    }).catch((err) => {
      console.error('[VendorAssignment] Notification failed (non-critical):', err);
    });

    return { success: true, assignmentId };
  } catch (error: any) {
    console.error('[VendorAssignment] assignVendorToProject error:', error);
    if (error.message === 'Unauthorized') {
      return { success: false, error: 'Session expired. Please log in again.' };
    }
    return { success: false, error: 'Failed to assign vendor. Please try again.' };
  }
}

/* ──────────────────────────────────────────────────────
   2. GET VENDOR ASSIGNMENTS FOR A PROJECT
   Returns all assignments for a given project.
   ────────────────────────────────────────────────────── */
export async function getProjectVendorAssignments(
  idToken: string,
  projectId: string
): Promise<{ success: boolean; assignments?: any[]; error?: string }> {
  try {
    const user = await verifyActionAuth(idToken);

    // Verify project access
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return { success: false, error: 'Project not found.' };
    }
    const projectData = projectSnap.data();

    if (!hasProjectAccess(user, projectData?.organizationId)) {
      return { success: false, error: 'Access denied for this project.' };
    }

    const assignmentsSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorAssignments')
      .orderBy('createdAt', 'desc')
      .get();

    const assignments = assignmentsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
        respondedAt: data.respondedAt?.toDate?.() || null,
        completedAt: data.completedAt?.toDate?.() || null,
      };
    });

    return { success: true, assignments };
  } catch (error: any) {
    console.error('[VendorAssignment] getProjectVendorAssignments error:', error);
    return { success: false, error: 'Failed to fetch assignments.' };
  }
}

/* ──────────────────────────────────────────────────────
   3. GET VENDOR INBOX REQUESTS
   Returns pending assignments for a vendor user.
   ────────────────────────────────────────────────────── */
export async function getVendorInboxRequests(
  idToken: string
): Promise<{ success: boolean; requests?: any[]; error?: string }> {
  try {
    const user = await verifyActionAuth(idToken);

    const inboxSnap = await adminDb
      .collection('users')
      .doc(user.uid)
      .collection('vendorInbox')
      .orderBy('createdAt', 'desc')
      .get();

    const requests = inboxSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });

    return { success: true, requests };
  } catch (error: any) {
    console.error('[VendorAssignment] getVendorInboxRequests error:', error);
    return { success: false, error: 'Failed to fetch vendor inbox.' };
  }
}

/* ──────────────────────────────────────────────────────
   4. UPDATE ASSIGNMENT STATUS
   Used by vendors to accept/decline, or investors to cancel/complete.
   Updates both the project sub-collection and the vendor inbox.
   ────────────────────────────────────────────────────── */
export async function updateAssignmentStatus(
  idToken: string,
  projectId: string,
  assignmentId: string,
  newStatus: AssignmentStatus,
  quotedFee?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await verifyActionAuth(idToken);

    // Fetch the assignment
    const assignmentRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('vendorAssignments')
      .doc(assignmentId);

    const assignmentSnap = await assignmentRef.get();
    if (!assignmentSnap.exists) {
      return { success: false, error: 'Assignment not found.' };
    }

    const assignment = assignmentSnap.data()!;

    // Authorization: vendor can accept/decline, investor can cancel/complete
    const isVendor = user.uid === assignment.vendorId;
    const isInvestor = user.uid === assignment.requestedBy;

    // Also check if the user has org-level access to the project
    let hasOrgAccess = false;
    if (!isInvestor) {
      const projectSnap = await adminDb.collection('projects').doc(projectId).get();
      if (projectSnap.exists) {
        hasOrgAccess = hasProjectAccess(user, projectSnap.data()?.organizationId);
      }
    }

    // Validate authorization based on the action
    if (newStatus === 'ACCEPTED' || newStatus === 'DECLINED') {
      if (!isVendor) {
        return { success: false, error: 'Only the assigned vendor can accept or decline.' };
      }
    }

    if (newStatus === 'CANCELLED') {
      if (!isInvestor && !hasOrgAccess) {
        return { success: false, error: 'Only the requesting investor can cancel an assignment.' };
      }
    }

    if (newStatus === 'COMPLETED') {
      if (!isInvestor && !hasOrgAccess) {
        return { success: false, error: 'Only the project owner can mark work as completed.' };
      }
    }

    // Validate state transitions
    const currentStatus = assignment.status as AssignmentStatus;
    const validTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
      PENDING: ['ACCEPTED', 'DECLINED', 'CANCELLED'],
      ACCEPTED: ['COMPLETED', 'CANCELLED'],
      DECLINED: [],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}.`,
      };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (newStatus === 'ACCEPTED' || newStatus === 'DECLINED') {
      updatePayload.respondedAt = FieldValue.serverTimestamp();
    }

    if (newStatus === 'COMPLETED') {
      updatePayload.completedAt = FieldValue.serverTimestamp();
    }

    if (quotedFee !== undefined && newStatus === 'ACCEPTED') {
      updatePayload.quotedFee = quotedFee;
    }

    // Batch update: assignment doc + vendor inbox
    const batch = adminDb.batch();
    batch.update(assignmentRef, updatePayload);

    // Update vendor inbox
    const inboxRef = adminDb
      .collection('users')
      .doc(assignment.vendorId)
      .collection('vendorInbox')
      .doc(assignmentId);

    const inboxSnap = await inboxRef.get();
    if (inboxSnap.exists) {
      batch.update(inboxRef, { status: newStatus });
    }

    await batch.commit();

    // Send notification to the other party
    const recipientId = isVendor ? assignment.requestedBy : assignment.vendorId;
    const actorName = user.displayName || user.email || 'A user';

    const statusMessages: Record<AssignmentStatus, string> = {
      ACCEPTED: `${assignment.vendorCompanyName || 'Vendor'} accepted the ${assignment.serviceType} assignment`,
      DECLINED: `${assignment.vendorCompanyName || 'Vendor'} declined the ${assignment.serviceType} assignment`,
      CANCELLED: `Assignment for ${assignment.serviceType} was cancelled`,
      COMPLETED: `${assignment.serviceType} work has been marked complete`,
      PENDING: '',
    };

    if (statusMessages[newStatus]) {
      NotificationService.createNotification({
        type: 'VENDOR_BID',
        recipientId,
        actor: { uid: user.uid, name: actorName },
        objectReference: {
          projectId,
          task: statusMessages[newStatus],
          dealAddress: 'the project',
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/vendors`,
      }).catch((err) => {
        console.error('[VendorAssignment] Status notification failed (non-critical):', err);
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('[VendorAssignment] updateAssignmentStatus error:', error);
    return { success: false, error: 'Failed to update assignment status.' };
  }
}
