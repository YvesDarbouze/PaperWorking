import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildInvestorInquiryMessage,
  validateInvitationAskBody,
} from '../../../lib/invitations/token-ask.js';

export type SubmitInvitationAskFn = (input: {
  token: string;
  message: string;
  inquiryMessage: ReturnType<typeof buildInvestorInquiryMessage>;
}) => Promise<{ threadId?: string }>;

export interface InvitationsTokenAskPostDeps {
  submitAsk?: SubmitInvitationAskFn;
}

/**
 * POST /api/invitations/[token]/ask — unauthenticated guest portal inquiry.
 */
export async function handleInvitationsTokenAskPost(
  token: string,
  body: { message?: unknown },
  deps: InvitationsTokenAskPostDeps = {},
): Promise<RouteResult> {
  const validated = validateInvitationAskBody(token, body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  try {
    const inquiryMessage = buildInvestorInquiryMessage(validated.message);

    if (deps.submitAsk) {
      await deps.submitAsk({
        token,
        message: validated.message,
        inquiryMessage,
      });
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('expired')) {
      return jsonResponse(410, { error: 'This invitation link has expired.' });
    }
    if (message.includes('not found')) {
      return jsonResponse(404, { error: 'Invitation not found.' });
    }
    if (message.includes('limit reached')) {
      return jsonResponse(429, {
        error: 'Message thread limit reached. Please wait for a response or contact support.',
      });
    }
    console.error('[Invitations ask] Error:', message);
    return jsonResponse(500, { error: 'Failed to submit inquiry' });
  }
}
