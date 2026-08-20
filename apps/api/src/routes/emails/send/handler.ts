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
  mock?: boolean;
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

    const idToken = String(body.idToken);
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    if (deps.verifyProjectAccess) {
      const access = await deps.verifyProjectAccess({
        uid: decoded.uid,
        projectId: validated.value.projectId,
      });
      if (!access.ok) {
        return jsonResponse(access.status, { error: access.error });
      }
    }

    const result = deps.sendCustomEmail
      ? await deps.sendCustomEmail({
          senderUid: decoded.uid,
          ...validated.value,
        })
      : { success: true, messageId: 'msg_mock', mock: true, recipientCount: validated.value.to.length };

    if (!result.success) {
      const errorMessage = 'error' in result ? result.error : undefined;
      return jsonResponse(500, { error: errorMessage || 'Failed to send.' });
    }

    return jsonResponse(200, {
      success: true,
      messageId: result.messageId,
      mock: result.mock,
      recipientCount: result.recipientCount,
      ...(result.mock && {
        message: 'Email mocked — set RESEND_API_KEY to enable live delivery.',
      }),
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
