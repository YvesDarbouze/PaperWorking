'use server';

import { adminDb } from '@/lib/firebase/admin';
import type { DealLedgerEntry } from '@/types/dealInvitation';

export interface TakedownReportInput {
  reporterName: string;
  reporterEmail: string;
  relationship: string;
  listingId?: string;
  propertyAddress?: string;
  reason: string;
  details: string;
}

/**
 * Public, unauthenticated server action to submit a takedown report
 * for a property deal listing.
 */
export async function submitTakedownReport(input: TakedownReportInput): Promise<{ success: boolean; ticketId: string }> {
  // Validate input
  if (!input.reporterName || !input.reporterEmail || !input.reason || !input.details) {
    throw new Error('Missing required report fields.');
  }

  const now = new Date();
  const slaDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour response SLA

  const ticketRef = adminDb.collection('support_tickets').doc();
  const ticketId = ticketRef.id;

  const targetListingId = input.listingId || '';
  let targetProjectId = '';
  let targetAddress = input.propertyAddress || '';
  let visibilityMode = 'PUBLIC_SOLICITED';
  let version = 1;

  // Resolve matching listing and project
  if (targetListingId) {
    const listingSnap = await adminDb.collection('dealListings').doc(targetListingId).get();
    if (listingSnap.exists) {
      const listingData = listingSnap.data();
      targetProjectId = listingData?.projectId || '';
      targetAddress = listingData?.address || targetAddress;
      visibilityMode = listingData?.visibilityMode || 'PUBLIC_SOLICITED';
      version = listingData?.version || 1;

      // 1. Move deal listing to the interim review state: 'takedown_review'
      // This immediately removes public visibility without deleting any underlying data.
      await adminDb.collection('dealListings').doc(targetListingId).update({
        status: 'takedown_review',
        updatedAt: now.toISOString(),
      });

      // 2. Write immutable ledger event TAKEDOWN_REVIEW_STARTED
      const ledgerRef = adminDb.collection('projects').doc(targetProjectId)
        .collection('dealLedger').doc();
      const ledgerData: DealLedgerEntry = {
        id: ledgerRef.id,
        projectId: targetProjectId,
        listingId: targetListingId,
        eventType: 'TAKEDOWN_REVIEW_STARTED',
        performedBy: 'anonymous_reporter',
        inviteeEmail: input.reporterEmail,
        version,
        visibilityMode: visibilityMode as any,
        timestamp: now.toISOString(),
        metadata: {
          ticketId,
          reporterName: input.reporterName,
          relationship: input.relationship,
          reason: input.reason,
          details: input.details,
        },
      };
      await ledgerRef.set(ledgerData);
    }
  }

  // Create operator queue support ticket
  await ticketRef.set({
    ticketId,
    subject: `Property Takedown: ${targetAddress || targetListingId || 'Unspecified Property'}`,
    requesterName: input.reporterName,
    requesterEmail: input.reporterEmail,
    priority: 'high',
    status: 'open',
    category: 'Property Takedown',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    assignee: 'Unassigned',
    responseSla: slaDate.toISOString(),
    metadata: {
      listingId: targetListingId,
      projectId: targetProjectId,
      relationship: input.relationship,
      reason: input.reason,
      details: input.details,
      propertyAddress: targetAddress,
    },
  });

  return { success: true, ticketId };
}

/**
 * Server action for platform operators to resolve a takedown report
 * in either direction (restoring or permanently withdrawing the deal).
 */
export async function resolveTakedownReport(
  idToken: string,
  ticketId: string,
  resolution: 'restore' | 'withdraw',
  notes: string
): Promise<{ success: boolean }> {
  const { adminAuth } = await import('@/lib/firebase/admin');
  const decoded = await adminAuth.verifyIdToken(idToken);
  if (!decoded.uid) throw new Error('Unauthenticated');

  // Verify caller has operator / platform admin permissions
  const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
  const userData = userSnap.data();
  if (userData?.role !== 'Platform Admin' && userData?.role !== 'Admin') {
    throw new Error('Unauthorized');
  }

  const ticketSnap = await adminDb.collection('support_tickets').doc(ticketId).get();
  if (!ticketSnap.exists) throw new Error('Ticket not found');

  const ticket = ticketSnap.data();
  const { listingId, projectId } = ticket?.metadata || {};

  const now = new Date();

  if (listingId && projectId) {
    const listingSnap = await adminDb.collection('dealListings').doc(listingId).get();
    if (listingSnap.exists) {
      const listingData = listingSnap.data();
      const version = listingData?.version || 1;
      const visibilityMode = listingData?.visibilityMode || 'PUBLIC_SOLICITED';

      const batch = adminDb.batch();

      if (resolution === 'restore') {
        // Restore listing back to 'published'
        batch.update(adminDb.collection('dealListings').doc(listingId), {
          status: 'published',
          updatedAt: now.toISOString(),
        });

        // Write ledger entry
        const ledgerRef = adminDb.collection('projects').doc(projectId)
          .collection('dealLedger').doc();
        const ledgerData: DealLedgerEntry = {
          id: ledgerRef.id,
          projectId,
          listingId,
          eventType: 'TAKEDOWN_RESOLVED_RESTORED',
          performedBy: decoded.uid,
          inviteeEmail: ticket?.requesterEmail || '',
          version,
          visibilityMode: visibilityMode as any,
          timestamp: now.toISOString(),
          metadata: {
            ticketId,
            notes,
          },
        };
        batch.set(ledgerRef, ledgerData);
      } else {
        // Permanently withdraw the listing
        batch.update(adminDb.collection('dealListings').doc(listingId), {
          status: 'withdrawn',
          updatedAt: now.toISOString(),
        });

        // Write ledger entry
        const ledgerRef = adminDb.collection('projects').doc(projectId)
          .collection('dealLedger').doc();
        const ledgerData: DealLedgerEntry = {
          id: ledgerRef.id,
          projectId,
          listingId,
          eventType: 'TAKEDOWN_RESOLVED_WITHDRAWN',
          performedBy: decoded.uid,
          inviteeEmail: ticket?.requesterEmail || '',
          version,
          visibilityMode: visibilityMode as any,
          timestamp: now.toISOString(),
          metadata: {
            ticketId,
            notes,
          },
        };
        batch.set(ledgerRef, ledgerData);
      }

      // Close the ticket
      batch.update(adminDb.collection('support_tickets').doc(ticketId), {
        status: 'closed',
        updatedAt: now.toISOString(),
      });

      await batch.commit();
    }
  } else {
    // Ticket resolved without listing mapping
    await adminDb.collection('support_tickets').doc(ticketId).update({
      status: 'closed',
      updatedAt: now.toISOString(),
    });
  }

  return { success: true };
}
