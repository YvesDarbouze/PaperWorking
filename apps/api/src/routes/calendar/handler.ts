import { jsonResponse, redirectResponse, type RouteResult } from '../../http/response.js';
import {
  buildCalendarEventTimes,
  buildCalendarSyncDescription,
  CALENDAR_EVENT_COLORS,
  isInvalidGrantError,
  mapCalendarEvents,
  validateCalendarSyncBody,
  type CalendarEventType,
} from '../../lib/calendar/helpers.js';

export type VerifySessionCookieFn = (
  sessionCookie: string,
) => Promise<{ uid: string } | null>;

export type BuildCalendarAuthUrlFn = () => string;

export type ExchangeCalendarCodeFn = (
  code: string,
) => Promise<{ refreshToken?: string | null }>;

export type SaveCalendarRefreshTokenFn = (uid: string, refreshToken: string) => Promise<void>;

export type LoadCalendarRefreshTokenFn = (uid: string) => Promise<string | null>;

export type FetchCalendarEventsFn = (
  refreshToken: string,
  maxResults?: number,
) => Promise<Array<Record<string, unknown>>>;

export type ClearCalendarRefreshTokenFn = (uid: string) => Promise<void>;

export type VerifyCalendarSyncAccessFn = (input: {
  uid: string;
  projectId: string;
}) => Promise<{
  authorized: boolean;
  project?: Record<string, unknown>;
  user?: Record<string, unknown>;
}>;

export type SyncCalendarEventFn = (input: {
  projectId: string;
  eventType: CalendarEventType;
  title: string;
  startIso: string;
  endIso: string;
  description: string;
  attendeeEmails: string[];
  existingEventId?: string;
  colorId: number;
}) => Promise<{ eventId: string; htmlLink: string }>;

export type PersistCalendarEventFn = (input: {
  projectId: string;
  eventType: CalendarEventType;
  eventId: string;
  htmlLink: string;
  title: string;
  date: string;
}) => Promise<void>;

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export interface CalendarAuthGetDeps {
  verifySession?: VerifySessionCookieFn;
  buildAuthUrl?: BuildCalendarAuthUrlFn;
}

export interface CalendarCallbackGetDeps {
  verifySession?: VerifySessionCookieFn;
  exchangeCode?: ExchangeCalendarCodeFn;
  saveRefreshToken?: SaveCalendarRefreshTokenFn;
}

export interface CalendarEventsGetDeps {
  verifySession?: VerifySessionCookieFn;
  loadRefreshToken?: LoadCalendarRefreshTokenFn;
  fetchEvents?: FetchCalendarEventsFn;
  clearRefreshToken?: ClearCalendarRefreshTokenFn;
}

export interface CalendarSyncPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  verifyAccess?: VerifyCalendarSyncAccessFn;
  hasServiceAccount?: () => boolean;
  syncEvent?: SyncCalendarEventFn;
  persistEvent?: PersistCalendarEventFn;
}

/**
 * GET /api/calendar/auth
 */
export async function handleCalendarAuthGet(
  sessionCookie: string | null | undefined,
  deps: CalendarAuthGetDeps = {},
): Promise<RouteResult> {
  if (!sessionCookie) {
    return { status: 401, body: 'Unauthorized' };
  }

  try {
    const session = deps.verifySession ? await deps.verifySession(sessionCookie) : { uid: 'user-1' };
    if (!session) return { status: 401, body: 'Unauthorized' };

    const authUrl = deps.buildAuthUrl
      ? deps.buildAuthUrl()
      : 'https://accounts.google.com/o/oauth2/v2/auth?scope=calendar';
    return redirectResponse(authUrl);
  } catch (error: unknown) {
    console.error('Error initiating Google OAuth:', error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

/**
 * GET /api/calendar/callback
 */
export async function handleCalendarCallbackGet(
  query: { code?: string | null; error?: string | null },
  sessionCookie: string | null | undefined,
  origin: string,
  deps: CalendarCallbackGetDeps = {},
): Promise<RouteResult> {
  if (query.error) {
    return redirectResponse(`${origin}/dashboard/home?calendar_error=access_denied`);
  }

  const code = query.code?.trim();
  if (!code) return { status: 400, body: 'No code provided' };
  if (!sessionCookie) return redirectResponse(`${origin}/login`);

  try {
    const session = deps.verifySession ? await deps.verifySession(sessionCookie) : null;
    if (!session) return redirectResponse(`${origin}/login`);

    const tokens = deps.exchangeCode ? await deps.exchangeCode(code) : { refreshToken: 'rt_demo' };
    if (tokens.refreshToken && deps.saveRefreshToken) {
      await deps.saveRefreshToken(session.uid, tokens.refreshToken);
    }

    return redirectResponse(`${origin}/dashboard/home?calendar_success=true`);
  } catch (error: unknown) {
    console.error('Error in Google OAuth callback:', error);
    return redirectResponse(`${origin}/dashboard/home?calendar_error=server_error`);
  }
}

/**
 * GET /api/calendar/events
 */
export async function handleCalendarEventsGet(
  sessionCookie: string | null | undefined,
  deps: CalendarEventsGetDeps = {},
): Promise<RouteResult> {
  if (!sessionCookie) return { status: 401, body: 'Unauthorized' };

  try {
    const session = deps.verifySession ? await deps.verifySession(sessionCookie) : null;
    if (!session) return { status: 401, body: 'Unauthorized' };

    const refreshToken = deps.loadRefreshToken ? await deps.loadRefreshToken(session.uid) : null;
    if (!refreshToken) {
      return jsonResponse(200, { connected: false });
    }

    try {
      const events = deps.fetchEvents ? await deps.fetchEvents(refreshToken, 5) : [];
      return jsonResponse(200, { connected: true, events: mapCalendarEvents(events) });
    } catch (apiError: unknown) {
      const message = apiError instanceof Error ? apiError.message : String(apiError);
      if (isInvalidGrantError(message) && deps.clearRefreshToken) {
        await deps.clearRefreshToken(session.uid);
      }
      if (isInvalidGrantError(message)) {
        return jsonResponse(200, { connected: false });
      }
      throw apiError;
    }
  } catch (error: unknown) {
    console.error('Error fetching calendar events:', error);
    return { status: 500, body: 'Internal Server Error' };
  }
}

/**
 * POST /api/calendar/sync
 */
export async function handleCalendarSyncPost(
  body: Record<string, unknown>,
  deps: CalendarSyncPostDeps = {},
): Promise<RouteResult> {
  const validated = validateCalendarSyncBody(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (!deps.verifyIdToken) return jsonResponse(500, { error: 'Auth not configured' });

  try {
    const decoded = await deps.verifyIdToken(idToken);
    const access = deps.verifyAccess
      ? await deps.verifyAccess({ uid: decoded.uid, projectId: validated.projectId })
      : { authorized: true, project: { propertyName: validated.projectId } };

    if (!access.authorized) {
      return jsonResponse(403, { error: 'Cross-tenant access denied.' });
    }

    if (deps.hasServiceAccount && !deps.hasServiceAccount()) {
      return jsonResponse(500, {
        error: 'Google Service Account credentials missing. Cannot sync calendar.',
      });
    }

    const times = buildCalendarEventTimes(validated.date, validated.durationMinutes);
    const description = buildCalendarSyncDescription(
      validated.description,
      access.project?.propertyName as string | undefined,
      validated.projectId,
    );

    const synced = deps.syncEvent
      ? await deps.syncEvent({
          projectId: validated.projectId,
          eventType: validated.eventType,
          title: validated.title,
          startIso: times.startIso,
          endIso: times.endIso,
          description,
          attendeeEmails: validated.attendeeEmails,
          existingEventId: validated.existingEventId,
          colorId: CALENDAR_EVENT_COLORS[validated.eventType],
        })
      : { eventId: 'evt_demo', htmlLink: 'https://calendar.google.com/event?eid=demo' };

    if (deps.persistEvent) {
      await deps.persistEvent({
        projectId: validated.projectId,
        eventType: validated.eventType,
        eventId: synced.eventId,
        htmlLink: synced.htmlLink,
        title: validated.title,
        date: validated.date,
      });
    }

    return jsonResponse(200, { success: true, eventId: synced.eventId, htmlLink: synced.htmlLink });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/id-token-expired') {
      return jsonResponse(401, { error: 'Session expired.' });
    }
    console.error('[Calendar Sync] Error:', error);
    return jsonResponse(500, {
      error: 'Failed to sync calendar event.',
      details: err.message || 'Unknown error',
    });
  }
}
