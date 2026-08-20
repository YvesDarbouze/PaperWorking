import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  buildGuestPortalResponse,
  validateInvitationTokenFormat,
  type GuestPortalInquiry,
  type GuestPortalInvitation,
  type GuestPortalMetricHistory,
  type GuestPortalProject,
  type GuestPortalRaiseProgress,
} from '../../../lib/invitations/guest-portal.js';

export interface GuestPortalLoadResult {
  invitation: GuestPortalInvitation;
  project: GuestPortalProject;
  raiseTarget: number;
  raiseProgress: GuestPortalRaiseProgress;
  daysLeft: number;
  hoursLeft: number;
  metricHistory: GuestPortalMetricHistory;
  commitmentStatus: string;
  commitmentId: string | null;
  inquiries: GuestPortalInquiry[];
}

export type LoadGuestPortalByTokenFn = (
  token: string,
) => Promise<GuestPortalLoadResult | null>;

export type MarkInvitationOpenedFn = (token: string) => Promise<void>;

export interface InvitationsTokenGetDeps {
  loadGuestPortal?: LoadGuestPortalByTokenFn;
  markOpened?: MarkInvitationOpenedFn;
  blockVendorCaller?: (callerUid: string | null) => Promise<boolean>;
}

export interface InvitationsTokenGetContext {
  callerUid?: string | null;
}

/**
 * GET /api/invitations/[token] — public guest portal data (token is credential).
 */
export async function handleInvitationsTokenGet(
  token: string,
  context: InvitationsTokenGetContext = {},
  deps: InvitationsTokenGetDeps = {},
): Promise<RouteResult> {
  if (context.callerUid && deps.blockVendorCaller) {
    const blocked = await deps.blockVendorCaller(context.callerUid);
    if (blocked) {
      return jsonResponse(404, { error: 'Not Found' });
    }
  }

  if (!validateInvitationTokenFormat(token)) {
    return jsonResponse(400, { error: 'Invalid token format' });
  }

  try {
    if (!deps.loadGuestPortal) {
      return jsonResponse(500, { error: 'Guest portal loader not configured' });
    }

    const loaded = await deps.loadGuestPortal(token);
    if (!loaded) {
      return jsonResponse(404, { error: 'Invitation not found.' });
    }

    const expiresAt =
      loaded.invitation.expiresAt instanceof Date
        ? loaded.invitation.expiresAt
        : new Date(loaded.invitation.expiresAt);

    if (loaded.invitation.status === 'expired' || expiresAt < new Date()) {
      return jsonResponse(410, { error: 'This invitation has expired.' });
    }

    if (
      (loaded.invitation.status === 'sent' || loaded.invitation.status === 'pending') &&
      deps.markOpened
    ) {
      await deps.markOpened(token).catch(() => {});
    }

    const response = buildGuestPortalResponse(loaded);
    return jsonResponse(200, response);
  } catch (error: unknown) {
    console.error('[GuestPortal] Token lookup failed:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
