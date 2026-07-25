import { communicationService } from './communicationService';
import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Strips quoted email reply history and standard signatures.
 */
export function stripQuotedHistoryAndSignatures(text: string): string {
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Quoted lines starting with >
    if (trimmed.startsWith('>')) {
      break;
    }

    // 2. Standard reply headers
    if (
      /^on\s+.*wrote:$/i.test(trimmed) ||
      /^from:\s+/i.test(trimmed) ||
      /^to:\s+/i.test(trimmed) ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('_____') ||
      /^sent\s+from\s+my/i.test(trimmed)
    ) {
      break;
    }

    // 3. Signature markers
    if (
      trimmed === '--' ||
      trimmed === 'Regards,' ||
      trimmed === 'Thanks,' ||
      trimmed === 'Sincerely,' ||
      trimmed === 'Best regards,' ||
      trimmed === 'Best,'
    ) {
      break;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

/**
 * InboundEmailHandler
 * Processes raw JSON payloads from SendGrid/Postmark webhooks.
 * Validates invitations via the reply token, strips quoted history/signatures,
 * and stitches emails directly into Q&A thread.
 */
export const inboundEmailHandler = {
  /**
   * Main entry point for webhook processing.
   */
  async processInbound(payload: any) {
    const { From, Subject, TextBody, MessageID } = payload;

    // 1. Extract Token from Recipient (To address or MailboxHash or envelope.to)
    let token: string | null = null;
    const recipient = payload.To || payload.to || '';
    const toMatch = recipient.match(/reply\+([a-zA-Z0-9_-]+)@/);
    if (toMatch) {
      token = toMatch[1];
    }

    if (!token && payload.MailboxHash) {
      token = payload.MailboxHash;
    }

    if (!token && payload.envelope?.to) {
      const envTo = Array.isArray(payload.envelope.to) ? payload.envelope.to[0] : payload.envelope.to;
      const envMatch = String(envTo).match(/reply\+([a-zA-Z0-9_-]+)@/);
      if (envMatch) {
        token = envMatch[1];
      }
    }

    if (!token) {
      console.warn(`[INBOUND REJECTED] No token found in recipient address: ${recipient}`);
      return { success: false, reason: 'unrecognized_thread' };
    }

    try {
      // 2. Resolve Invitation and Verify Token
      let snap = await adminDb
        .collection('dealInvitations')
        .where('token', '==', token)
        .limit(1)
        .get();

      let isDealInvitation = true;
      if (snap.empty) {
        snap = await adminDb
          .collection('invitations')
          .where('token', '==', token)
          .limit(1)
          .get();
        if (!snap.empty) {
          isDealInvitation = false;
        }
      }

      if (snap.empty) {
        console.warn(`[INBOUND REJECTED] Invitation token ${token} does not exist.`);
        return { success: false, reason: 'unrecognized_thread' };
      }

      const invDoc = snap.docs[0];
      const invRef = invDoc.ref;
      const rawInv = invDoc.data();
      const inv = isDealInvitation
        ? {
            id: rawInv.id,
            token: rawInv.token,
            email: rawInv.inviteeEmail,
            name: rawInv.inviteeName || 'Anonymous Investor',
            projectId: rawInv.projectId,
            invitedByUid: rawInv.inviterUid || 'system',
            status: rawInv.status,
            createdAt: rawInv.createdAt,
            expiresAt: rawInv.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            version: rawInv.version || 1,
            visibilityMode: rawInv.visibilityMode || 'PRIVATE',
            listingId: rawInv.listingId || '',
          }
        : rawInv;

      // 3. Expiry check
      const expiresAt: Date = inv.expiresAt?.toDate ? inv.expiresAt.toDate() : new Date(inv.expiresAt);
      if (expiresAt < new Date()) {
        console.warn(`[INBOUND REJECTED] Invitation link has expired.`);
        return { success: false, reason: 'link_expired' };
      }

      const projectId = inv.projectId;

      // 4. Resolve Organization ID
      const dealSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!dealSnap.exists) {
        console.warn(`[INBOUND REJECTED] Project ${projectId} does not exist.`);
        return { success: false, reason: 'deal_not_found' };
      }

      const projectData = dealSnap.data()!;
      const organizationId = projectData.organizationId;
      if (!organizationId) {
        console.error(`[CRITICAL] Project ${projectId} organizationId is missing.`);
        return { success: false, reason: 'corrupt_data_state' };
      }

      // 5. Clean body
      const cleanedBody = stripQuotedHistoryAndSignatures(TextBody || payload.text || '');

      // 6. Stitch message into investorInquiries subcollection
      const inquiriesSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('investorInquiries')
        .where('invitationId', '==', invRef.id)
        .get();

      const now = FieldValue.serverTimestamp();
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sender: 'investor',
        text: cleanedBody,
        createdAt: new Date().toISOString(),
      };

      if (!inquiriesSnap.empty) {
        const threadDoc = inquiriesSnap.docs[0];
        const data = threadDoc.data();
        const messagesList = data.messages || [];

        if (messagesList.length >= 20) {
          console.warn(`[INBOUND REJECTED] Message thread limit reached for invitation ${invRef.id}`);
          return { success: false, reason: 'thread_limit_reached' };
        }

        await threadDoc.ref.update({
          messages: FieldValue.arrayUnion(newMessage),
          status: 'open',
          updatedAt: now,
        });
      } else {
        await adminDb
          .collection('projects')
          .doc(projectId)
          .collection('investorInquiries')
          .add({
            projectId,
            invitationId: invRef.id,
            investorName: inv.name || 'Anonymous Investor',
            investorEmail: inv.email || null,
            message: cleanedBody,
            status: 'open',
            isShared: false,
            messages: [newMessage],
            createdAt: now,
            updatedAt: now,
          });
      }

      // 7. Write to dealLedger
      const ledgerRef = adminDb.collection('projects').doc(projectId).collection('dealLedger').doc();
      await ledgerRef.set({
        id: ledgerRef.id,
        projectId,
        listingId: inv.listingId || '',
        eventType: 'INVITATION_RESPONSE',
        performedBy: inv.invitedByUid || 'system',
        inviteeEmail: inv.email || 'unknown',
        version: inv.version || 1,
        visibilityMode: inv.visibilityMode || 'PRIVATE',
        timestamp: new Date().toISOString(),
        metadata: {
          invitationId: invRef.id,
          status: 'question',
          question: cleanedBody,
        },
      });

      // 8. Log the message in communicationService
      await communicationService.logMessage(projectId, organizationId, {
        senderEmail: From,
        senderName: inv.name || From.split('@')[0],
        type: 'EMAIL_INBOUND',
        subject: Subject,
        body: cleanedBody,
        providerMessageId: MessageID || null,
      });

      console.log(`[INBOUND SUCCESS] Email ${MessageID} stitched into thread for invitation ${invRef.id}`);
      return { success: true, projectId };
    } catch (error) {
      console.error('[INBOUND ERROR] Webhook processing failed:', error);
      return { success: false, reason: 'internal_server_error' };
    }
  },
};
