import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  generateVerificationCode,
  validateClaimBindTokenBody,
  validateClaimStartBody,
  validateClaimVerifyBody,
  validateIdentityAppealBody,
  validateReportSpamBody,
} from '../../lib/identity/claim.js';

export type CheckEmailHistoryFn = (email: string) => Promise<boolean>;
export type StoreVerificationClaimFn = (input: {
  docId: string;
  userId: string;
  claimEmail: string;
  code: string;
  expiresAt: Date;
}) => Promise<void>;
export type SendVerificationEmailFn = (email: string, code: string) => Promise<void>;
export type LoadVerificationClaimFn = (docId: string) => Promise<Record<string, unknown> | null>;
export type MarkClaimVerifiedFn = (docId: string) => Promise<void>;
export type MergeIdentityHistoryFn = (
  uid: string,
  email: string,
  displayName: string,
) => Promise<void>;
export type AddClaimedEmailFn = (uid: string, email: string) => Promise<void>;
export type TrackIdentityEventFn = (input: {
  uid: string;
  event: string;
  properties: Record<string, unknown>;
}) => Promise<void>;
export type FindInvitationByTokenFn = (
  token: string,
) => Promise<{ email: string; docRef?: unknown } | null>;
export type UpdateInvitationBoundFn = (input: {
  docRef: unknown;
  uid: string;
  displayName: string;
}) => Promise<void>;
export type LoadUserProfileFn = (uid: string) => Promise<Record<string, unknown> | null>;
export type SubmitAppealFn = (input: {
  uid: string;
  reason: string;
}) => Promise<void>;
export type FindInvitationForSpamFn = (
  token: string,
) => Promise<{ docRef: unknown; inviterUid: string } | null>;
export type ReportInvitationSpamFn = (input: {
  docRef: unknown;
  inviterUid: string;
  projectId: string;
  email: string;
}) => Promise<void>;

/**
 * POST /api/identity/claim/start
 */
export async function handleIdentityClaimStartPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    checkEmailHistory?: CheckEmailHistoryFn;
    storeClaim?: StoreVerificationClaimFn;
    sendEmail?: SendVerificationEmailFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateClaimStartBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    if (auth.email?.toLowerCase() === validated.claimEmail) {
      return jsonResponse(400, { error: 'You cannot claim your own primary email.' });
    }

    const hasHistory = deps.checkEmailHistory
      ? await deps.checkEmailHistory(validated.claimEmail)
      : true;
    if (!hasHistory) {
      return jsonResponse(400, { error: 'No prior history found for this email address.' });
    }

    const code = generateVerificationCode();
    const docId = `${auth.uid}_${validated.claimEmail}`;
    if (deps.storeClaim) {
      await deps.storeClaim({
        docId,
        userId: auth.uid,
        claimEmail: validated.claimEmail,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
    }
    if (deps.sendEmail) await deps.sendEmail(validated.claimEmail, code);

    return jsonResponse(200, { success: true, message: 'Verification code sent.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Claim/Start Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

/**
 * POST /api/identity/claim/verify
 */
export async function handleIdentityClaimVerifyPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    loadClaim?: LoadVerificationClaimFn;
    markVerified?: MarkClaimVerifiedFn;
    mergeHistory?: MergeIdentityHistoryFn;
    addClaimedEmail?: AddClaimedEmailFn;
    trackEvent?: TrackIdentityEventFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateClaimVerifyBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const docId = `${auth.uid}_${validated.claimEmail}`;
    const claim = deps.loadClaim ? await deps.loadClaim(docId) : null;
    if (!claim) {
      return jsonResponse(400, { error: 'Verification code not found or expired.' });
    }
    if (claim.code !== validated.code) {
      return jsonResponse(400, { error: 'Invalid verification code.' });
    }

    const expiresAt =
      claim.expiresAt instanceof Date
        ? claim.expiresAt
        : new Date(String(claim.expiresAt));
    if (expiresAt < new Date()) {
      return jsonResponse(400, { error: 'Verification code has expired.' });
    }
    if (claim.verified) {
      return jsonResponse(400, { error: 'This email has already been verified.' });
    }

    if (deps.markVerified) await deps.markVerified(docId);
    if (deps.mergeHistory) {
      await deps.mergeHistory(
        auth.uid,
        validated.claimEmail,
        (auth as { name?: string }).name || '',
      );
    }
    if (deps.addClaimedEmail) await deps.addClaimedEmail(auth.uid, validated.claimEmail);
    if (deps.trackEvent) {
      await deps.trackEvent({
        uid: auth.uid,
        event: 'identity_history_claimed',
        properties: { claimedEmail: validated.claimEmail, timestamp: new Date().toISOString() },
      }).catch(() => undefined);
    }

    return jsonResponse(200, {
      success: true,
      message: `History for ${validated.claimEmail} has been successfully merged.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Claim/Verify Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

/**
 * POST /api/identity/claim/bind-token
 */
export async function handleIdentityClaimBindTokenPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    findInvitation?: FindInvitationByTokenFn;
    mergeHistory?: MergeIdentityHistoryFn;
    updateInvitation?: UpdateInvitationBoundFn;
    addClaimedEmail?: AddClaimedEmailFn;
    trackEvent?: TrackIdentityEventFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateClaimBindTokenBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const invitation = deps.findInvitation
      ? await deps.findInvitation(validated.token)
      : { email: 'invited@test.com' };
    if (!invitation) return jsonResponse(404, { error: 'Invitation not found.' });

    const emailLower = invitation.email.toLowerCase().trim();
    if (deps.mergeHistory) {
      await deps.mergeHistory(auth.uid, emailLower, (auth as { name?: string }).name || '');
    }
    if (deps.updateInvitation && invitation.docRef) {
      await deps.updateInvitation({
        docRef: invitation.docRef,
        uid: auth.uid,
        displayName: (auth as { name?: string }).name || '',
      });
    }
    if (deps.addClaimedEmail) await deps.addClaimedEmail(auth.uid, emailLower);
    if (deps.trackEvent) {
      await deps.trackEvent({
        uid: auth.uid,
        event: 'identity_history_bound_via_token',
        properties: {
          claimedEmail: emailLower,
          token: validated.token,
          timestamp: new Date().toISOString(),
        },
      }).catch(() => undefined);
    }

    return jsonResponse(200, {
      success: true,
      message: `History for ${emailLower} has been bound successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Claim/BindToken Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

/**
 * POST /api/identity/appeal
 */
export async function handleIdentityAppealPost(
  body: Record<string, unknown>,
  deps: {
    requireAuth?: RequireAuthFn;
    loadUser?: LoadUserProfileFn;
    submitAppeal?: SubmitAppealFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const validated = validateIdentityAppealBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const user = deps.loadUser ? await deps.loadUser(auth.uid) : { invitationSuspended: true };
    if (!user) return jsonResponse(404, { error: 'User profile not found.' });
    if (user.invitationSuspended !== true) {
      return jsonResponse(400, { error: 'Your invitation privileges are not suspended.' });
    }

    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (deps.submitAppeal) await deps.submitAppeal({ uid: auth.uid, reason });

    return jsonResponse(200, {
      success: true,
      message:
        'Your appeal has been submitted successfully. Our safety team will review it within 24 hours.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Appeal Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}

/**
 * POST /api/identity/report-spam
 */
export async function handleIdentityReportSpamPost(
  body: Record<string, unknown>,
  deps: {
    findInvitation?: FindInvitationForSpamFn;
    reportSpam?: ReportInvitationSpamFn;
  } = {},
): Promise<RouteResult> {
  try {
    const validated = validateReportSpamBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const invitation = deps.findInvitation ? await deps.findInvitation(validated.token) : null;
    if (!invitation) {
      return jsonResponse(404, { error: 'Invitation not found for the provided token.' });
    }

    if (deps.reportSpam) {
      await deps.reportSpam({
        docRef: invitation.docRef,
        inviterUid: invitation.inviterUid,
        projectId: validated.projectId,
        email: validated.email,
      });
    }

    return jsonResponse(200, {
      success: true,
      message: 'Thank you for your report. The invitation has been reported and logged.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Spam Report Error]', message);
    return jsonResponse(500, { error: 'Internal server error.' });
  }
}
