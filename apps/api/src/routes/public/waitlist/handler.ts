import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { isValidWaitlistEmail } from '../../../lib/public/forms.js';

export interface WaitlistEntryPayload {
  email: string;
  source: string;
  userAgent: string | null;
}

export interface WaitlistConfirmationEmail {
  to: string;
  appUrl: string;
}

export type CheckWaitlistExistsFn = (email: string) => Promise<boolean>;
export type SaveWaitlistEntryFn = (entry: WaitlistEntryPayload) => Promise<void>;
export type SendWaitlistConfirmationFn = (params: WaitlistConfirmationEmail) => Promise<void>;

export interface WaitlistPostDeps {
  checkExists?: CheckWaitlistExistsFn;
  saveEntry?: SaveWaitlistEntryFn;
  sendConfirmation?: SendWaitlistConfirmationFn;
  appUrl?: string;
}

export interface WaitlistPostBody {
  email?: unknown;
}

export interface WaitlistRequestHeaders {
  referer?: string | null;
  userAgent?: string | null;
}

/**
 * POST /api/waitlist — public waitlist signup with deduplication.
 */
export async function handleWaitlistPost(
  body: WaitlistPostBody,
  headers: WaitlistRequestHeaders = {},
  deps: WaitlistPostDeps = {},
): Promise<RouteResult> {
  try {
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    if (!isValidWaitlistEmail(rawEmail)) {
      return jsonResponse(400, { error: 'A valid email address is required.' });
    }

    const normalizedEmail = rawEmail.toLowerCase();

    if (deps.checkExists && (await deps.checkExists(normalizedEmail))) {
      return jsonResponse(200, { success: true, alreadyJoined: true });
    }

    if (deps.saveEntry) {
      await deps.saveEntry({
        email: normalizedEmail,
        source: headers.referer || 'direct',
        userAgent: headers.userAgent ?? null,
      });
    }

    if (deps.sendConfirmation) {
      await deps.sendConfirmation({
        to: normalizedEmail,
        appUrl: deps.appUrl ?? 'https://paperworking.co',
      });
    }

    return jsonResponse(201, { success: true, alreadyJoined: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Waitlist] Error:', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
