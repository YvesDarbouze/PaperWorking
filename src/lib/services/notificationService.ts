// ═══════════════════════════════════════════════════════
//  PaperWorking Notification Service — Core Logic
// ═══════════════════════════════════════════════════════

import { adminDb } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  Notification,
  NotificationType,
  NotificationObjectReference,
  NotificationActor,
  NOTIFICATION_METADATA
} from '../../types/notification';

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  actor: NotificationActor;
  objectReference: NotificationObjectReference;
  deepLinkUrl: string;
  expiresAt?: Date;
}

export const NotificationService = {
  /**
   * Evaluates templates to build the formatted title and body.
   * Performs guardrail validation checks.
   */
  buildNotificationContent(
    type: NotificationType,
    objectReference: NotificationObjectReference,
    actorName: string
  ): { title: string; body: string } {
    const meta = NOTIFICATION_METADATA[type];
    if (!meta) {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    // 1. Generate Title via Catalog template
    const title = meta.templateTitle({ ...objectReference, actorName });

    // 2. Generate Body dynamically
    let body = '';
    const address = objectReference.dealAddress || 'the property';
    const amount = objectReference.amount || '$0.00';
    const time = objectReference.time || 'soon';
    const task = objectReference.task || 'the assigned task';
    const phase = objectReference.phase || 'new';
    const plan = objectReference.plan || 'Plan';
    const card = objectReference.card || 'card';
    const documentName = objectReference.documentName || 'document';
    const organizationName = objectReference.organizationName || 'organization';
    const dailyBurnRate = objectReference.dailyBurnRate || '$0.00';

    switch (type) {
      case 'VENDOR_BID':
        body = `Review the bid submitted by ${actorName} for task '${task}' and approve the proposal.`;
        break;
      case 'INVEST_INVITE':
        body = `${actorName} has invited you to co-invest in the project at ${address}. View the syndication terms and pledge details.`;
        break;
      case 'TASK_COMPLETE':
        body = `The task '${task}' has been marked complete by ${actorName}. Checklist progress updated.`;
        break;
      case 'PHASE_TRANSITION':
        body = `Project advanced from the previous phase to '${phase}'.`;
        break;
      case 'DEADLINE_ALERT':
        body = `Action required: The contingency deadline for ${address} is expiring in ${time}. Ensure all requirements are completed to avoid contract default.`;
        break;
      case 'BILLING_CHARGED':
        body = `Your subscription plan '${plan}' has been successfully renewed. A charge of ${amount} was billed to your ${card}.`;
        break;
      case 'DOCUMENT_SIGNED':
        body = `The document '${documentName}' has been e-signed by ${actorName} and successfully verified in the project folder.`;
        break;
      case 'RECEIPT_APPROVAL':
        body = `Receipt of ${amount} was uploaded by ${actorName}. Lead Investor approval is required to update the approved holding and rehab spend.`;
        break;
      case 'TEAM_INVITE':
        body = `You have been invited to join the organization '${organizationName}' by ${actorName}. Click to accept the invitation.`;
        break;
      case 'OVER_IMPROVEMENT_ALERT':
        body = `Risk alert: The estimated rehab budget exceeds the safety threshold of 30% of the After Repair Value (ARV) for ${address}.`;
        break;
      case 'BURN_RATE_WARNING':
        body = `Daily holding costs have accumulated to ${dailyBurnRate} per day for ${address}. Track daily spend to stay within contingency.`;
        break;
      default:
        body = `A system event has occurred on ${address}.`;
    }

    return { title, body };
  },

  /**
   * Creates a notification document in Firestore.
   * Validates structure and assigns urgency and N3 channels.
   */
  async createNotification(params: CreateNotificationParams): Promise<string> {
    const { recipientId, type, actor, objectReference, deepLinkUrl, expiresAt } = params;

    // 1. Input validations
    if (!recipientId) throw new Error('recipientId is required.');
    if (!type) throw new Error('type is required.');
    if (!actor || !actor.uid || !actor.name) throw new Error('actor with uid and name is required.');
    if (!objectReference) throw new Error('objectReference is required.');
    if (!deepLinkUrl) throw new Error('deepLinkUrl is required.');

    const meta = NOTIFICATION_METADATA[type];
    if (!meta) throw new Error(`Unsupported notification type: ${type}`);

    // 2. Build Title and Body
    const { title, body } = this.buildNotificationContent(type, objectReference, actor.name);

    // 3. Document payload
    const notificationId = `not_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;

    const docData = {
      id: notificationId,
      recipientId,
      type,
      title,
      body,
      actor,
      objectReference,
      urgencyLevel: meta.urgency,
      channels: meta.channels,
      read: false,
      archived: false,
      createdAt: FieldValue.serverTimestamp(),
      deepLinkUrl,
      ...(expiresAt ? { expiresAt } : {})
    };

    // 4. Save to Firestore
    await adminDb.collection('notifications').doc(notificationId).set(docData);

    console.log(`[NotificationService] Created notification ${notificationId} of type ${type} for user ${recipientId}`);

    return notificationId;
  },

  /**
   * Marks a notification as read.
   */
  async markAsRead(notificationId: string): Promise<void> {
    await adminDb.collection('notifications').doc(notificationId).update({
      read: true,
      readAt: FieldValue.serverTimestamp()
    });
  },

  /**
   * Archives a notification.
   */
  async archiveNotification(notificationId: string): Promise<void> {
    await adminDb.collection('notifications').doc(notificationId).update({
      archived: true
    });
  },

  /**
   * Fetches user-scoped notifications.
   */
  async getNotificationsForUser(
    recipientId: string,
    options?: { limit?: number; unreadOnly?: boolean; includeArchived?: boolean }
  ): Promise<any[]> {
    let queryRef = adminDb.collection('notifications')
      .where('recipientId', '==', recipientId);

    if (options?.unreadOnly) {
      queryRef = queryRef.where('read', '==', false);
    }

    if (!options?.includeArchived) {
      queryRef = queryRef.where('archived', '==', false);
    }

    // Sort newest first
    queryRef = queryRef.orderBy('createdAt', 'desc');

    if (options?.limit) {
      queryRef = queryRef.limit(options.limit);
    }

    const snap = await queryRef.get();
    return snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
        readAt: data.readAt ? data.readAt.toDate() : null
      };
    });
  }
};
