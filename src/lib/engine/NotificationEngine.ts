// src/lib/engine/NotificationEngine.ts
import { adminDb } from '@/lib/firebase/admin';
import { PresenceService } from '@/lib/services/PresenceService';
import { CommunicationEngine } from './CommunicationEngine';

/**
 * NotificationEngine — Logic for triggering offline alerts
 * 
 * This service acts as the 'listener' logic for new messages. 
 * It determines who needs to be notified and dispatches emails if they are offline.
 */

export const NotificationEngine = {
  /**
   * triggerMessageNotification
   * Fires after a message is written to Firestore.
   */
  async triggerMessageNotification(projectId: string, messageId: string): Promise<void> {
    try {
      // 1. Fetch message data
      const messageSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('messages')
        .doc(messageId)
        .get();

      if (!messageSnap.exists) return;
      const messageData = messageSnap.data()!;

      // 2. Fetch project context (team members)
      const projectSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!projectSnap.exists) return;
      const projectData = projectSnap.data()!;

      const senderUid = messageData.senderUid;
      const teamMembers: string[] = projectData.teamMembers || [];
      const ownerId: string = projectData.ownerId;

      // All relevant participants (team + owner) minus the sender
      const recipients = Array.from(new Set([...teamMembers, ownerId]))
        .filter(uid => uid && uid !== senderUid);

      if (recipients.length === 0) return;

      console.log(`[NotificationEngine] Evaluating ${recipients.length} recipients for message ${messageId}`);

      // 3. Evaluate each recipient
      for (const uid of recipients) {
        const isOnline = await PresenceService.isUserOnline(uid);

        if (!isOnline) {
          console.log(`[NotificationEngine] User ${uid} is offline. Triggering email notification.`);

          // Dispatch notification via CommunicationEngine
          // Using canned template 'notification' which handles participant resolution
          await CommunicationEngine.sendCannedEmail('notification', uid, {
            projectId,
            senderName: messageData.senderName || 'A team member',
            projectName: projectData.propertyName || projectData.name || 'Project',
            messageSnippet: messageData.body || 'New message content',
          });
        } else {
          console.log(`[NotificationEngine] User ${uid} is online. Skipping email.`);
        }
      }
    } catch (err) {
      console.error('[NotificationEngine] Trigger failed:', err);
    }
  }
};
