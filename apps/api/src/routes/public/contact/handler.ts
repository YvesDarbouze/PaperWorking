import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  generateSupportTicketId,
  validateContactForm,
  type ContactFormInput,
} from '../../../lib/public/forms.js';

export interface SupportTicketPayload {
  id: string;
  subject: string;
  body: string;
  requesterEmail: string;
  requesterName: string;
  tag: string;
}

export type CreateSupportTicketFn = (ticket: SupportTicketPayload) => Promise<void>;

export interface ContactPostDeps {
  createSupportTicket?: CreateSupportTicketFn;
  generateTicketId?: () => string;
}

/**
 * POST /api/contact — public contact form (failure-safe ticket creation).
 */
export async function handleContactPost(
  body: ContactFormInput,
  deps: ContactPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateContactForm(body);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const { value } = validated;
    const ticketId = deps.generateTicketId?.() ?? generateSupportTicketId();

    if (deps.createSupportTicket) {
      try {
        await deps.createSupportTicket({
          id: ticketId,
          subject: value.subject,
          body: value.body,
          requesterEmail: value.email,
          requesterName: value.name,
          tag: value.tag,
        });
      } catch (dbErr: unknown) {
        console.error('[POST /api/contact] Additive ticket creation error:', dbErr);
      }
    }

    return jsonResponse(200, {
      success: true,
      message: 'Thank you for reaching out. Your message has been received.',
      ticketId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/contact] Fatal handler error:', message);
    return jsonResponse(500, { success: false, error: message || 'Server error' });
  }
}
