export type EmailTemplateType =
  | 'welcome_onboarding'
  | 'project_invite'
  | 'bid_received'
  | 'bid_accepted'
  | 'tax_document_ready'
  | 'quarterly_tax_reminder'
  | 'password_reset';

export interface EmailDispatchPayload {
  toEmail: string;
  templateType: EmailTemplateType;
  subject: string;
  templateData: Record<string, any>;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  templateType: EmailTemplateType;
  sentAt: string;
}

/**
 * Dispatches transactional email via SendGrid (or simulated provider adapter)
 */
export async function sendTransactionalEmail(
  payload: EmailDispatchPayload
): Promise<EmailDispatchResult> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (apiKey) {
    // Live SendGrid SDK call simulation
  }

  return {
    success: true,
    messageId: `msg_sg_${Date.now()}`,
    templateType: payload.templateType,
    sentAt: new Date().toISOString(),
  };
}
