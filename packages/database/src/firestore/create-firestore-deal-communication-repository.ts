import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FIRESTORE_COLLECTIONS, getFirestoreAdmin } from './admin.js';
import { optionalString, toDate } from './converters/timestamp.js';
import { FirestoreDealRepository } from './repositories/deal.repository.js';
import { documentData, requireFirestore, type FirestoreClientFactory } from './repositories/firestore-access.js';

/** Firestore deal broadcast/reply persistence (dealListings + dealInvitations + messages). */
export function createFirestoreDealCommunicationRepository(
  firestoreFactory: FirestoreClientFactory = getFirestoreAdmin,
) {
  const deals = new FirestoreDealRepository(firestoreFactory);

  return {
    async findDealById(dealId: string) {
      return deals.findDealSummaryById(dealId);
    },

    async createBroadcastWithInvitations(data: {
      dealId: string;
      senderId: string;
      recipientEmails: string[];
      subject: string;
      message: string;
      includeBusinessCard: boolean;
    }) {
      const db = await requireFirestore(firestoreFactory);
      const deal = await deals.findDealSummaryById(data.dealId);
      if (!deal) {
        throw new Error(`Deal not found: ${data.dealId}`);
      }

      const broadcastId = randomUUID();
      const now = FieldValue.serverTimestamp();
      const createdAt = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invitations = [];
      for (const inviteeEmail of data.recipientEmails) {
        const invitationId = randomUUID();
        const token = randomUUID();
        await db.collection(FIRESTORE_COLLECTIONS.dealInvitations).doc(invitationId).set({
          id: invitationId,
          dealListingId: data.dealId,
          dealId: data.dealId,
          projectId: deal.projectId ?? '',
          inviterUid: data.senderId,
          inviteeEmail,
          token,
          status: 'pending',
          expiresAt,
          businessCardShared: data.includeBusinessCard,
          broadcastId,
          subject: data.subject,
          message: data.message,
          createdAt: now,
          updatedAt: now,
        });
        invitations.push({
          id: invitationId,
          dealId: data.dealId,
          inviteeEmail,
          inviteeUserId: null,
          status: 'pending',
          businessCardShared: data.includeBusinessCard,
          createdAt,
        });
      }

      await db.collection(FIRESTORE_COLLECTIONS.messages).doc(broadcastId).set({
        id: broadcastId,
        type: 'deal_broadcast',
        dealId: data.dealId,
        senderId: data.senderId,
        recipientEmails: data.recipientEmails,
        subject: data.subject,
        message: data.message,
        includeBusinessCard: data.includeBusinessCard,
        createdAt: now,
      });

      return {
        broadcast: {
          id: broadcastId,
          dealId: data.dealId,
          senderId: data.senderId,
          recipientEmails: data.recipientEmails,
          subject: data.subject,
          message: data.message,
          includeBusinessCard: data.includeBusinessCard,
          createdAt,
        },
        invitations,
      };
    },

    async createMessage(data: {
      dealId: string;
      senderEmail: string;
      content: string;
      senderId?: string;
      source: 'platform' | 'email_inbound';
    }) {
      const db = await requireFirestore(firestoreFactory);
      const messageId = randomUUID();
      const now = FieldValue.serverTimestamp();
      const createdAt = new Date();

      await db.collection(FIRESTORE_COLLECTIONS.messages).doc(messageId).set({
        id: messageId,
        type: 'deal_message',
        dealId: data.dealId,
        senderId: data.senderId ?? null,
        senderEmail: data.senderEmail,
        content: data.content,
        source: data.source,
        createdAt: now,
      });

      return {
        id: messageId,
        dealId: data.dealId,
        senderId: data.senderId ?? null,
        senderEmail: data.senderEmail,
        content: data.content,
        source: data.source,
        createdAt,
      };
    },

    async listInvitationsForUser(input: { uid: string; email?: string }) {
      const db = await requireFirestore(firestoreFactory);
      const snap = await db.collection(FIRESTORE_COLLECTIONS.dealInvitations).get();
      const email = input.email?.trim().toLowerCase();
      return snap.docs.flatMap((doc) => {
        const data = documentData(doc);
        if (!data) return [];
        const inviteeUserId = optionalString(data.inviteeUserId);
        const inviteeEmail = optionalString(data.inviteeEmail)?.toLowerCase();
        if (inviteeUserId !== input.uid && (!email || inviteeEmail !== email)) return [];
        return [
          {
            id: doc.id,
            dealId: optionalString(data.dealId) ?? optionalString(data.dealListingId) ?? '',
            inviteeEmail: inviteeEmail ?? '',
            inviteeUserId: inviteeUserId ?? null,
            businessCardShared: Boolean(data.businessCardShared),
            status: optionalString(data.status) ?? 'pending',
            createdAt: toDate(data.createdAt, 'createdAt'),
          },
        ];
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async createStandaloneInvitation(data: {
      dealId: string;
      inviteeEmail: string;
      inviteeUserId?: string;
      businessCardShared: boolean;
    }) {
      const db = await requireFirestore(firestoreFactory);
      const invitationId = randomUUID();
      const token = randomUUID();
      const now = FieldValue.serverTimestamp();
      await db.collection(FIRESTORE_COLLECTIONS.dealInvitations).doc(invitationId).set({
        id: invitationId,
        dealListingId: data.dealId,
        dealId: data.dealId,
        inviteeEmail: data.inviteeEmail.trim().toLowerCase(),
        inviteeUserId: data.inviteeUserId ?? null,
        token,
        status: 'pending',
        businessCardShared: data.businessCardShared,
        createdAt: now,
        updatedAt: now,
      });
      return {
        id: invitationId,
        dealId: data.dealId,
        inviteeEmail: data.inviteeEmail,
        inviteeUserId: data.inviteeUserId ?? null,
        businessCardShared: data.businessCardShared,
        status: 'pending',
        createdAt: new Date(),
      };
    },
  };
}

export type FirestoreDealCommunicationRepository = ReturnType<
  typeof createFirestoreDealCommunicationRepository
>;
