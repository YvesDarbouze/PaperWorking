import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { validateSendEmailBody, type SendEmailBody } from '../../../lib/emails/send.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type VerifyEmailProjectAccessFn = (input: {
  uid: string;
  projectId: string;
}) => Promise<{ ok: true } | { ok: false; status: number; error: string }>;

export type SendCustomEmailFn = (input: {
  senderUid: string;
  projectId: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}) => Promise<{
  success: boolean;
  messageId?: string;
  recipientCount?: number;
  error?: string;
}>;

export interface EmailsSendPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  verifyProjectAccess?: VerifyEmailProjectAccessFn;
  sendCustomEmail?: SendCustomEmailFn;
}

/**
 * POST /api/emails/send
 */
export async function handleEmailsSendPost(
  body: SendEmailBody,
  deps: EmailsSendPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateSendEmailBody(body);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    if (!deps.verifyIdToken) {
      return jsonResponse(500, { error: 'Auth token verifier not configured' });
    }

    const idToken = String(body.idToken);
    const decoded = await deps.verifyIdToken(idToken);

    if (deps.verifyProjectAccess) {
      const access = await deps.verifyProjectAccess({
        uid: decoded.uid,
        projectId: validated.value.projectId,
      });
      if (!access.ok) {
        return jsonResponse(access.status, { error: access.error });
      }
    }

    if (!deps.sendCustomEmail) {
      return jsonResponse(503, {
        success: false,
        error: 'REQUIRES CREDENTIALS: Email provider unconfigured. Set SENDGRID_API_KEY for live delivery.',
        requiresCredentials: true,
      });
    }

    const result = await deps.sendCustomEmail({
      senderUid: decoded.uid,
      ...validated.value,
    });

    if (!result.success) {
      const errorMessage = 'error' in result ? result.error : undefined;
      return jsonResponse(500, { error: errorMessage || 'Failed to send.' });
    }

    return jsonResponse(200, {
      success: true,
      messageId: result.messageId,
      recipientCount: result.recipientCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email Send] Error:', message);
    if (message.includes('id-token-expired')) {
      return jsonResponse(401, { error: 'Session expired.' });
    }
    return jsonResponse(500, { error: 'Failed to send email.', details: message });
  }
}
