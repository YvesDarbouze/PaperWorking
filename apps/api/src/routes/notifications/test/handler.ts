import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  prefixTestEmailSubject,
  prefixTestEmailText,
  validateNotificationTestBody,
  type NotificationTestTemplate,
} from '../../../lib/notifications/test.js';

export type BuildNotificationFixtureFn = (
  template: NotificationTestTemplate,
) => Promise<{ subject: string; html: string; text: string }>;

export type ResolveUserEmailFn = (userId: string) => Promise<string | null>;

export type SendTestNotificationEmailFn = (input: {
  userId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  templateType: NotificationTestTemplate;
}) => Promise<void>;

export interface NotificationsTestPostDeps {
  requireAuth?: RequireAuthFn;
  resolveUserEmail?: ResolveUserEmailFn;
  buildFixture?: BuildNotificationFixtureFn;
  sendEmail?: SendTestNotificationEmailFn;
}

/**
 * POST /api/notifications/test
 */
export async function handleNotificationsTestPost(
  body: { template?: unknown },
  deps: NotificationsTestPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateNotificationTestBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, {
      success: false,
      error: validated.error,
      details: validated.details,
    });
  }

  const email = deps.resolveUserEmail
    ? await deps.resolveUserEmail(auth.uid)
    : 'user@test.com';

  if (!email) {
    return jsonResponse(404, { success: false, error: 'User email not found' });
  }

  try {
    const fixture = deps.buildFixture
      ? await deps.buildFixture(validated.template)
      : { subject: 'Test', html: '<p>Test</p>', text: 'Test' };

    const subject = prefixTestEmailSubject(fixture.subject);
    const text = prefixTestEmailText(fixture.text);

    if (deps.sendEmail) {
      await deps.sendEmail({
        userId: auth.uid,
        to: email,
        subject,
        html: fixture.html,
        text,
        templateType: validated.template,
      });
    }

    return jsonResponse(200, {
      success: true,
      message: `Test email sent for template "${validated.template}" to ${email}`,
      template: validated.template,
      to: email,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/notifications/test] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
