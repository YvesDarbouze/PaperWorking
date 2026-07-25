// ═══════════════════════════════════════════════════════
//  PaperWorking Notification Service — Core Logic
// ═══════════════════════════════════════════════════════

import { adminDb, adminMessaging } from '../firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  Notification,
  NotificationType,
  NotificationObjectReference,
  NotificationActor,
  NOTIFICATION_METADATA,
  getNotificationCategory,
  NotificationChannel
} from '../../types/notification';

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  actor: NotificationActor;
  objectReference: NotificationObjectReference;
  deepLinkUrl: string;
  expiresAt?: Date;
}

export function isUserInDND(userData: any): boolean {
  const timezone = userData?.preferences?.quietHours?.timezone || userData?.preferences?.timezone || 'America/New_York';
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hourStr = parts.find(p => p.type === 'hour')?.value;
    const minuteStr = parts.find(p => p.type === 'minute')?.value;
    if (!hourStr || !minuteStr) return false;
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const minutes = hour * 60 + minute;

    // Default quiet hours: 10 PM (22:00) to 8 AM (08:00)
    let startHour = 22;
    let startMinute = 0;
    let endHour = 8;
    let endMinute = 0;

    // If user has custom quiet hours, respect them
    const userQuiet = userData?.preferences?.quietHours;
    if (userQuiet?.enabled && userQuiet.start && userQuiet.end) {
      const [uStartH, uStartM] = userQuiet.start.split(':').map(Number);
      const [uEndH, uEndM] = userQuiet.end.split(':').map(Number);
      
      const userStartMinutes = uStartH * 60 + uStartM;
      const userEndMinutes = uEndH * 60 + uEndM;
      
      const inUserQuiet = userStartMinutes > userEndMinutes
        ? (minutes >= userStartMinutes || minutes <= userEndMinutes)
        : (minutes >= userStartMinutes && minutes <= userEndMinutes);
      
      if (inUserQuiet) return true;
    }

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return minutes >= startMinutes || minutes <= endMinutes;
  } catch (err) {
    console.error('[NotificationService] Error checking user DND:', err);
    return false;
  }
}

export function getSafeContentForEmailOrPush(
  type: NotificationType,
  title: string,
  body: string,
  objectReference: NotificationObjectReference,
  actorName: string
): { title: string; body: string } {
  const SENSITIVE_TYPES: NotificationType[] = [
    'BILLING_CHARGED',
    'RECEIPT_APPROVAL',
    'BURN_RATE_WARNING',
    'OVER_IMPROVEMENT_ALERT',
    'VENDOR_BID',
    'INVEST_INVITE',
    'VENDOR_LEAD'
  ];

  if (!SENSITIVE_TYPES.includes(type)) {
    return { title, body };
  }

  const address = objectReference.dealAddress || 'your property';
  const task = objectReference.task || 'assigned task';
  const plan = objectReference.plan || 'your plan';

  switch (type) {
    case 'BILLING_CHARGED':
      return {
        title: `Billing Notice — ${plan}`,
        body: `Your subscription has been renewed. Please check your authenticated inbox for the invoice and payment details.`
      };
    case 'RECEIPT_APPROVAL':
      return {
        title: `Receipt Approval Required — ${address}`,
        body: `A new project receipt has been uploaded by ${actorName} and requires your approval. Please view the transaction details in your authenticated inbox.`
      };
    case 'VENDOR_BID':
      return {
        title: `New Bid Submitted — ${address}`,
        body: `A new contractor bid has been submitted by ${actorName} for '${task}'. Please review the proposal terms in your authenticated inbox.`
      };
    case 'VENDOR_LEAD':
      return {
        title: `New Lead — ${address}`,
        body: `A real estate investor has requested a quote for a new project. Please review the lead details in your authenticated inbox.`
      };
    case 'BURN_RATE_WARNING':
      return {
        title: `Holding Cost Alert — ${address}`,
        body: `Holding costs have exceeded the safe daily burn rate threshold for ${address}. Please review the cost breakdown in your authenticated inbox.`
      };
    case 'OVER_IMPROVEMENT_ALERT':
      return {
        title: `Rehab Budget Alert — ${address}`,
        body: `A potential over-improvement risk has been flagged for ${address}. Please check your authenticated inbox for details.`
      };
    case 'INVEST_INVITE':
      return {
        title: `Investment Invitation — ${address}`,
        body: `You have been invited to co-invest in a project at ${address}. Please view the syndication terms and pledge details in your authenticated inbox.`
      };
    default:
      return { title, body };
  }
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
      case 'VENDOR_LEAD':
        body = `You have received a new lead from ${actorName} for a project at ${address}. View the project details to submit a quote.`;
        break;
      case 'INVEST_INVITE':
        body = `${actorName} has invited you to co-invest in the project at ${address}. View the syndication terms and pledge details.`;
        break;
      case 'TASK_COMPLETE':
        body = `The task '${task}' has been marked complete by ${actorName}. Checklist progress updated.`;
        break;
      case 'TASK_ASSIGNED':
        body = `You have been assigned the task '${task}' by ${actorName}.`;
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
      case 'NEGOTIATION_UPDATE':
        body = (objectReference.metadata?.body as string) || `${actorName} sent a negotiation update for the deal at ${address}.`;
        break;
      case 'LENDER_CHECKLIST_REMINDER':
        body = `The customary underwriting document '${documentName}' is still pending upload. Please check the Lender Vault and upload it to the Project Files.`;
        break;
      case 'SLIPPAGE_DETECTED':
        body = `Slippage Alert: Milestone '${task}' is past its target date without completion. Customary delays are frequently caused by underwriting backlogs, title defects, or repair negotiations.`;
        break;
      case 'DEAL_MATERIAL_CHANGE':
        body = `The deal at ${address} has been edited. The following changes are material: ${task || 'details updated'}. Please review the updated terms.`;
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

    // 2. Resolve final expiresAt based on time-sensitive defaults
    let finalExpiresAt = expiresAt;
    if (!finalExpiresAt) {
      const now = new Date();
      if (type === 'DEADLINE_ALERT') {
        finalExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h
      } else if (type === 'INVEST_INVITE' || type === 'TEAM_INVITE') {
        finalExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7d
      } else if (type === 'VENDOR_BID' || type === 'RECEIPT_APPROVAL') {
        finalExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14d
      }
    }

    // 3. Build Title and Body (for secure in-app storage)
    const { title, body } = this.buildNotificationContent(type, objectReference, actor.name);

    // Fetch recipient user document once to resolve custom preferences
    let userDoc: any = null;
    try {
      userDoc = await adminDb.collection('users').doc(recipientId).get();
    } catch (err) {
      console.error('[NotificationService] Failed to fetch recipient user doc:', err);
    }
    const userData = userDoc?.exists ? userDoc.data() : null;

    if (userData && (userData.role === 'Vendor' || userData.accountType === 'vendor')) {
      const isDealRelated = type === 'INVEST_INVITE' || 
                            type === 'RECEIPT_APPROVAL' ||
                            type === 'BURN_RATE_WARNING' ||
                            type === 'OVER_IMPROVEMENT_ALERT' ||
                            type === 'VENDOR_BID' ||
                            type === 'DEAL_MATERIAL_CHANGE' ||
                            type === 'LENDER_CHECKLIST_REMINDER' ||
                            type === 'SLIPPAGE_DETECTED' ||
                            !!objectReference.projectId ||
                            !!objectReference.dealAddress;
      if (isDealRelated) {
        console.log(`[NotificationService] Suppressing deal-related notification ${type} for Vendor ${recipientId}`);
        return `skipped_vendor_block_${Date.now()}`;
      }
    }

    // Resolve user activity offline state (lastActiveAt > 5m ago)
    let isOffline = true;
    if (userData?.lastActiveAt) {
      const lastActiveDate = userData.lastActiveAt.toDate ? userData.lastActiveAt.toDate() : new Date(userData.lastActiveAt);
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      isOffline = lastActiveDate < fiveMinsAgo;
    }

    // Determine active channels based on custom category-level preferences
    const category = getNotificationCategory(type);

    let inboxEnabled = meta.channels.includes('in-app');
    let emailEnabled = meta.channels.includes('email');
    let pushEnabled = meta.channels.includes('push');

    const categoryPrefs = userData?.preferences?.categories?.[category];
    if (categoryPrefs) {
      if (categoryPrefs.inbox !== undefined) inboxEnabled = categoryPrefs.inbox;
      if (categoryPrefs.email !== undefined) emailEnabled = categoryPrefs.email;
      if (categoryPrefs.push !== undefined) pushEnabled = categoryPrefs.push;
    }

    // Apply global toggles
    const globalEmailEnabled = userData?.preferences?.emailEnabled !== false;
    const globalPushEnabled = userData?.preferences?.pushEnabled !== false;

    if (!globalEmailEnabled) emailEnabled = false;
    if (!globalPushEnabled) pushEnabled = false;

    // Guardrail: Critical billing and deadlines cannot be disabled for inbox/email
    if (category === 'billing' || category === 'deadlines') {
      inboxEnabled = true;
      emailEnabled = true;
    }

    const activeChannels: NotificationChannel[] = [];
    if (inboxEnabled) activeChannels.push('in-app');
    if (emailEnabled) activeChannels.push('email');
    if (pushEnabled) activeChannels.push('push');

    // 4. Document payload (detailed, stored securely in-app)
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
      channels: activeChannels,
      read: false,
      archived: false,
      createdAt: FieldValue.serverTimestamp(),
      deepLinkUrl,
      ...(finalExpiresAt ? { expiresAt: finalExpiresAt } : {})
    };

    // 5. Save to Firestore if in-app channel is active
    if (inboxEnabled) {
      await adminDb.collection('notifications').doc(notificationId).set(docData);
      console.log(`[NotificationService] Created notification ${notificationId} of type ${type} for user ${recipientId}`);
    } else {
      console.log(`[NotificationService] Skipped saving in-app notification document for ${recipientId} due to opt-out.`);
    }

    // Get safe versions of title/body for email and push channels (guarding financial specifics)
    const { title: safeTitle, body: safeBody } = getSafeContentForEmailOrPush(
      type,
      title,
      body,
      objectReference,
      actor.name
    );

    // 6. Determine if critical vs batchable
    const isCritical = type === 'DEADLINE_ALERT' || 
                       type === 'BILLING_CHARGED' || 
                       type === 'OVER_IMPROVEMENT_ALERT' || 
                       type === 'BURN_RATE_WARNING' || 
                       type === 'INVEST_INVITE' ||
                       meta.urgency === 'critical';

    const inDND = isUserInDND(userData);
    const shouldQueue = inDND || isOffline;

    // If batchable, always queue
    if (!isCritical) {
      if (emailEnabled || pushEnabled) {
        console.log(`[NotificationService] Queuing batchable notification ${notificationId} of type ${type} for ${recipientId}.`);
        await adminDb.collection('queued_emails').add({
          recipientId,
          recipientEmail: userData?.email || null,
          status: 'pending',
          isBatchable: true,
          type,
          projectId: objectReference.projectId || null,
          dealAddress: objectReference.dealAddress || null,
          notificationId,
          actorName: actor.name,
          deepLinkUrl,
          sendEmail: emailEnabled,
          sendPush: pushEnabled,
          title: safeTitle,
          body: safeBody,
          // Storing extra fields for batched formatters
          amount: objectReference.amount || null,
          task: objectReference.task || null,
          phase: objectReference.phase || null,
          plan: objectReference.plan || null,
          card: objectReference.card || null,
          documentName: objectReference.documentName || null,
          organizationName: objectReference.organizationName || null,
          dailyBurnRate: objectReference.dailyBurnRate || null,
          createdAt: FieldValue.serverTimestamp(),
          retryCount: 0,
          ...(finalExpiresAt ? { expiresAt: finalExpiresAt } : {})
        });
      }
      return notificationId;
    }

    // If critical and should queue (in DND or offline), queue individually
    if (shouldQueue) {
      if (emailEnabled || pushEnabled) {
        console.log(`[NotificationService] DND or offline active for ${recipientId}. Queueing critical notification ${notificationId}.`);
        
        let html = '';
        let subject = safeTitle;
        if (emailEnabled && userData?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
          const { generateSystemNotificationEmail } = await import(
            '../emails/templates/SystemNotificationEmail'
          );
          const rendered = generateSystemNotificationEmail({
            title: safeTitle,
            body: safeBody,
            deepLinkUrl,
            appUrl,
            type,
            objectReference,
            actorName: actor.name,
          });
          subject = rendered.subject;
          html = rendered.html;
        }

        await adminDb.collection('queued_emails').add({
          recipientId,
          recipientEmail: userData?.email || null,
          status: 'pending',
          isBatchable: false,
          type,
          projectId: objectReference.projectId || null,
          dealAddress: objectReference.dealAddress || null,
          notificationId,
          actorName: actor.name,
          deepLinkUrl,
          sendEmail: emailEnabled,
          sendPush: pushEnabled,
          title: safeTitle,
          body: safeBody,
          subject,
          html,
          createdAt: FieldValue.serverTimestamp(),
          retryCount: 0,
          ...(finalExpiresAt ? { expiresAt: finalExpiresAt } : {})
        });
      }
      return notificationId;
    }

    // Outside DND & Online: Dispatch Web Push if 'push' channel is active
    if (pushEnabled && userDoc?.exists) {
      try {
        const fcmTokens = userData?.fcmTokens || [];
        if (fcmTokens.length > 0) {
          let ttlSeconds: number | undefined = undefined;
          if (finalExpiresAt) {
            const remainingMs = finalExpiresAt.getTime() - Date.now();
            ttlSeconds = Math.max(0, Math.floor(remainingMs / 1000));
          }

          const multicastMessage = {
            tokens: fcmTokens,
            notification: {
              title: safeTitle,
              body: safeBody,
            },
            data: {
              deepLinkUrl: deepLinkUrl,
              title: safeTitle,
              body: safeBody,
            },
            webpush: {
              headers: {
                Urgency: 'high',
                ...(ttlSeconds !== undefined ? { TTL: String(ttlSeconds) } : {})
              },
              notification: {
                clickAction: deepLinkUrl,
                requireInteraction: true,
              },
            },
          };

          const response = await adminMessaging.sendEachForMulticast(multicastMessage);
          console.log(`[NotificationService] Sent push to ${fcmTokens.length} devices. Success: ${response.successCount}`);

          // Stale token cleanup
          const tokensToRemove: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error) {
              const code = resp.error.code;
              if (
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered'
              ) {
                tokensToRemove.push(fcmTokens[idx]);
              }
            }
          });

          if (tokensToRemove.length > 0) {
            await adminDb.collection('users').doc(recipientId).update({
              fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
            });
            console.log(`[NotificationService] Cleaned up ${tokensToRemove.length} stale FCM tokens`);
          }
        }
      } catch (pushErr) {
        console.error('[NotificationService] FCM push dispatch failed:', pushErr);
      }
    }

    // Outside DND & Online: Dispatch Email immediately if 'email' channel is active
    if (emailEnabled && userDoc?.exists) {
      try {
        const email = userData?.email;
        if (email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
          const { generateSystemNotificationEmail } = await import(
            '../emails/templates/SystemNotificationEmail'
          );
          const { CommunicationEngine } = await import('../../lib/engine/CommunicationEngine');

          // Render system email
          const { subject, html } = generateSystemNotificationEmail({
            title: safeTitle,
            body: safeBody,
            deepLinkUrl,
            appUrl,
            type,
            objectReference,
            actorName: actor.name,
          });

          console.log(`[NotificationService] Dispatching notification email immediately to ${email}`);
          await CommunicationEngine.sendRawEmail([email], subject, html);
        }
      } catch (emailErr) {
        console.error('[NotificationService] Email dispatch failed:', emailErr);
      }
    }

    return notificationId;
  },

  /**
   * Broadcasts a notification to all project members who have permissions to view it.
   */
  async broadcastProjectNotification(
    projectId: string,
    params: {
      type: NotificationType;
      actor: { uid: string; name: string; role?: string };
      objectReference: any;
      deepLinkUrl: string;
      expiresAt?: Date;
    }
  ): Promise<void> {
    try {
      const projectSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!projectSnap.exists) {
        console.error(`[NotificationService] Project ${projectId} not found for broadcast`);
        return;
      }
      const projectData = projectSnap.data()!;
      const recipients = new Set<string>();

      // 1. Add ownerUid / createdBy (Lead Investor)
      const ownerUid = projectData.ownerUid || projectData.createdBy;
      if (ownerUid) {
        recipients.add(ownerUid);
      }

      // 2. Add members map users
      if (projectData.members) {
        for (const [uid, member] of Object.entries(projectData.members)) {
          const m = member as any;
          if (m.role === 'Lead Investor' || m.role === 'General Contractor') {
            recipients.add(uid);
          }
        }
      }

      // 3. Add organization team members/owner
      if (projectData.organizationId) {
        const orgSnap = await adminDb.collection('organizations').doc(projectData.organizationId).get();
        if (orgSnap.exists) {
          const orgData = orgSnap.data()!;
          if (orgData.ownerUid) {
            recipients.add(orgData.ownerUid);
          }
          if (Array.isArray(orgData.teamMembers)) {
            for (const m of orgData.teamMembers) {
              if (m.id && m.status === 'active') {
                recipients.add(m.id);
              }
            }
          }
        }
      }

      // 4. Add linked equity parties (LPs / co_buyers) if they have view permissions for the current phase
      if (Array.isArray(projectData.equityParties)) {
        const currentPhase = projectData.currentPhase || 2;
        const phaseKey = `phase-${currentPhase}`;

        for (const party of projectData.equityParties) {
          const canView = party.phasePermissions?.[phaseKey]?.canView === true;
          if (canView) {
            if (party.memberId) {
              recipients.add(party.memberId);
            } else if (party.email) {
              try {
                const { adminAuth } = require('@/lib/firebase/admin');
                const userRecord = await adminAuth.getUserByEmail(party.email).catch(() => null);
                if (userRecord?.uid) {
                  recipients.add(userRecord.uid);
                }
              } catch (lookupErr) {
                // Ignore lookup errors
              }
            }
          }
        }
      }

      // Send notifications to all resolved recipients (failure-isolated)
      const sendPromises = Array.from(recipients).map(async (recipientId) => {
        try {
          await this.createNotification({
            recipientId,
            ...params,
          });
        } catch (err: any) {
          console.error(`[NotificationService] Failed to send broadcast notification to ${recipientId}:`, err.message);
        }
      });

      await Promise.all(sendPromises);
    } catch (error: any) {
      console.error(`[NotificationService] Failed to broadcast notification:`, error.message);
    }
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
