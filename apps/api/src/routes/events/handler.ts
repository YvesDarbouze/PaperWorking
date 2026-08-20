import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  isAnonymousAuthToken,
  MILESTONE_EVENTS,
  sanitizeEventProperties,
  validateEventsPostBody,
} from '../../lib/events/ingestion.js';

export type CaptureTelemetryFn = (input: {
  uid: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp?: Date;
}) => Promise<void>;
export type LogEventFn = (doc: Record<string, unknown>) => Promise<void>;
export type HandleMilestoneFn = (input: {
  uid: string;
  event: string;
  properties: Record<string, unknown>;
  email?: string | null;
  name?: string | null;
}) => Promise<void>;

/**
 * POST /api/events
 */
export async function handleEventsPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    authToken?: Record<string, unknown>;
    captureTelemetry?: CaptureTelemetryFn;
    logEvent?: LogEventFn;
    handleMilestone?: HandleMilestoneFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const token = deps.authToken ?? {};
    if (isAnonymousAuthToken(token)) {
      return jsonResponse(401, { error: 'Unauthorized — anonymous users not allowed' });
    }

    const validated = validateEventsPostBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const sanitized = sanitizeEventProperties(validated.properties);

    if (deps.captureTelemetry) {
      await deps.captureTelemetry({
        uid: auth.uid,
        event: validated.event,
        properties: sanitized,
        timestamp: validated.timestamp ? new Date(validated.timestamp) : new Date(),
      }).catch(() => undefined);
    }

    if (deps.logEvent) {
      await deps.logEvent({ uid: auth.uid, event: validated.event, properties: sanitized }).catch(() => undefined);
    }

    if (MILESTONE_EVENTS.has(validated.event) && deps.handleMilestone) {
      await deps.handleMilestone({
        uid: auth.uid,
        event: validated.event,
        properties: sanitized,
        email: auth.email,
      }).catch(() => undefined);
    }

    return jsonResponse(200, { success: true, event: validated.event });
  } catch (err: unknown) {
    console.error('[Events API]', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
