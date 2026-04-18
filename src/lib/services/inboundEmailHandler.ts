import { communicationService } from './communicationService';
import { adminDb } from '../firebase/admin';

/**
 * InboundEmailHandler
 * Processes raw JSON payloads from SendGrid/Postmark webhooks.
 */
export const inboundEmailHandler = {

  /**
   * Main entry point for webhook processing.
   */
  async processInbound(payload: any) {
    // Note: SendGrid sends an array of events, Postmark sends a single object.
    // We'll normalize for Postmark-style single objects for this implementation.
    
    const { From, Subject, TextBody, MessageID } = payload;

    // 1. Extract Deal ID from subject
    // Pattern: [ref:deal_DEALID]
    const match = Subject.match(/\[ref:deal_([^\]]+)\]/);
    const projectId = match ? match[1] : null;

    if (!projectId) {
      console.warn(`[INBOUND REJECTED] No deal reference found in subject: ${Subject}`);
      return { success: false, reason: 'unrecognized_thread' };
    }

    // 2. Resolve Organization ID from Firestore
    // We must identify the tenant boundary before logging the message
    try {
      const dealSnap = await adminDb.collection('projects').doc(projectId).get();
      
      if (!dealSnap.exists) {
        console.warn(`[INBOUND REJECTED] Deal ${projectId} referenced in email ${MessageID} does not exist.`);
        return { success: false, reason: 'deal_not_found' };
      }

      const organizationId = dealSnap.data()?.organizationId;

      if (!organizationId) {
        console.error(`[CRITICAL] Deal ${projectId} found but organizationId is missing. Data integrity failure.`);
        return { success: false, reason: 'corrupt_data_state' };
      }

      // 3. Log the message
      await communicationService.logMessage(projectId, organizationId, {
        senderEmail: From,
        senderName: From.split('@')[0], // Fallback name
        type: 'EMAIL_INBOUND',
        subject: Subject,
        body: TextBody,
        providerMessageId: MessageID,
      });

      console.log(`[INBOUND SUCCESS] Email ${MessageID} linked to Deal ${projectId} (Org: ${organizationId})`);
      return { success: true, projectId };
    } catch (error) {
      console.error(`[SERVER ERROR] Failed to resolve deal ${projectId} during email processing:`, error);
      return { success: false, reason: 'internal_server_error' };
    }
  }
};
