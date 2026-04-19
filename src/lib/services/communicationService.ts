import { db } from '../firebase/config';
import { collection, doc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { prisma } from "../prisma";
import { CommunicationMessage, MessageType } from '@/types/schema';

/**
 * CommunicationService
 * Handles outbound email dispatch and internal comment threading.
 * Implementation for SendGrid/Postmark context.
 */
export const communicationService = {
  
  /**
   * Appends a tracking ID to the email subject.
   */
  generateTrackingSubject(originalSubject: string, projectId: string) {
    return `${originalSubject} [ref:deal_${projectId}]`;
  },

  /**
   * Logs a message into the deal's communication history.
   */
  async logMessage(projectId: string, organizationId: string, message: Partial<CommunicationMessage>) {
    try {
      // 1. Sync to Firestore for Real-time UI
      const messagesRef = collection(db, 'projects', projectId, 'messages');
      const firestoreDoc = await addDoc(messagesRef, {
        ...message,
        projectId,
        organizationId,
        createdAt: serverTimestamp(),
      });

      // 2. Sync to Prisma for Portfolio Analytics - Safe wrapper
      try {
        if (prisma) {
          await prisma.communicationLog.create({
            data: {
              linkedProjectId: projectId,
              organizationId: organizationId,
              type: message.type || 'INTERNAL_COMMENT',
              direction: message.type === 'EMAIL_INBOUND' ? 'IN' : 'OUT',
              fromAddress: message.senderEmail || 'system@paperworking.io',
              toAddress: 'multiple', // Simplified for log
              subject: message.subject ?? '',
              body: message.body || '',
              providerMessageId: message.providerMessageId,
              threadId: projectId, // Groups by projectId as default thread
            }
          });
        }
      } catch (error) {
        console.warn('[Audit Warning] Communication audit logging (Prisma) failed.', error);
      }

      return firestoreDoc.id;
    } catch (error) {
      console.error('Communication Audit Failure: Could not persist message.', error);
      throw error;
    }
  },

  /**
   * Sends an automated status update email.
   * Mock implementation of SendGrid/Postmark integration.
   */
  async sendStatusUpdateEmail(projectId: string, organizationId: string, recipients: string[], subject: string, body: string) {
    const trackingSubject = this.generateTrackingSubject(subject, projectId);
    
    console.log(`[OUTBOUND EMAIL] To: ${recipients.join(', ')} | Sub: ${trackingSubject}`);
    
    // In real deployment, call SendGrid/Postmark API here
    const mockProviderId = `msg_${Math.random().toString(36).substr(2, 9)}`;

    await this.logMessage(projectId, organizationId, {
      senderEmail: 'notifications@paperworking.io',
      senderName: 'PaperWorking System',
      type: 'EMAIL_OUTBOUND',
      subject: trackingSubject,
      body: body,
      providerMessageId: mockProviderId
    });
  }
};
