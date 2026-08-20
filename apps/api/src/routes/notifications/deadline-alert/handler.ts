import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildDeadlineTimeLabel,
  validateDeadlineAlertBody,
} from '../../../lib/notifications/deadline-alert.js';

export type VerifyBearerTokenFn = (authorization?: string | null) => Promise<{ uid: string } | null>;
export type CreateDeadlineNotificationFn = (input: {
  uid: string;
  recipientId: string;
  projectId: string;
  dealAddress: string;
  contingencyType: string;
  timeLabel: string;
  deadlineDate: string;
}) => Promise<string>;

/**
 * POST /api/notifications/deadline-alert
 */
export async function handleNotificationsDeadlineAlertPost(
  body: Record<string, unknown>,
  headers: { authorization?: string | null },
  deps: {
    verifyBearer?: VerifyBearerTokenFn;
    createNotification?: CreateDeadlineNotificationFn;
  } = {},
): Promise<RouteResult> {
  try {
    const auth = deps.verifyBearer ? await deps.verifyBearer(headers.authorization) : { uid: 'system' };
    if (!auth) return jsonResponse(401, { success: false, error: 'Unauthorized' });

    const validated = validateDeadlineAlertBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { success: false, error: validated.error });

    const timeLabel = buildDeadlineTimeLabel(validated.daysUntil);
    const notificationId = deps.createNotification
      ? await deps.createNotification({
          uid: auth.uid,
          recipientId: validated.recipientId,
          projectId: validated.projectId,
          dealAddress: validated.dealAddress,
          contingencyType: validated.contingencyType,
          timeLabel,
          deadlineDate: validated.deadlineDate,
        })
      : 'notif-1';

    return jsonResponse(200, { success: true, notificationId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as { code?: string }).code === 'auth/id-token-expired') {
      return jsonResponse(401, { success: false, error: 'Session expired.' });
    }
    console.error('[DeadlineAlert]', message);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
