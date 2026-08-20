import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildInvitationRecord,
  buildInviteUrl,
  canSendInvitation,
  generateInvitationToken,
  validateSendInvitationBody,
} from '../../../lib/invitations/send.js';

export type LoadProjectForInviteFn = (
  projectId: string,
) => Promise<{
  propertyName?: string;
  organizationId?: string;
  members?: Record<string, { role?: string; projectPermissions?: string[] }>;
} | null>;

export type LoadCallerProfileFn = (
  uid: string,
) => Promise<{ displayName?: string; companyName?: string; organizationId?: string; role?: string } | null>;

export type PersistInvitationFn = (
  record: Record<string, unknown>,
) => Promise<{ invitationId: string }>;

export interface InvitationsSendPostDeps {
  requireAuth?: RequireAuthFn;
  loadProject?: LoadProjectForInviteFn;
  loadCallerProfile?: LoadCallerProfileFn;
  persistInvitation?: PersistInvitationFn;
  appUrl?: string;
}

/**
 * POST /api/invitations/send — authenticated project invitation creation.
 */
export async function handleInvitationsSendPost(
  body: {
    projectId?: unknown;
    dealName?: unknown;
    email?: unknown;
    name?: unknown;
    proposedEquityPercent?: unknown;
    proposedAmount?: unknown;
  },
  deps: InvitationsSendPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateSendInvitationBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { success: false, error: validated.error });
  }

  try {
    const project = deps.loadProject
      ? await deps.loadProject(validated.projectId)
      : {
          propertyName: 'Test Deal',
          organizationId: 'org-1',
          members: { [auth.uid]: { role: 'Lead Investor' } },
        };

    if (!project) {
      return jsonResponse(404, { success: false, error: 'Deal not found' });
    }

    if (!project.organizationId) {
      return jsonResponse(422, {
        success: false,
        error: 'Organization context missing from deal',
      });
    }

    const callerProfile = deps.loadCallerProfile
      ? await deps.loadCallerProfile(auth.uid)
      : { displayName: 'PaperWorking User' };

    const authorized = canSendInvitation({
      callerUid: auth.uid,
      members: project.members ?? {},
      organizationId: project.organizationId,
      callerOrgId: callerProfile?.organizationId,
      callerRole: callerProfile?.role,
    });

    if (!authorized) {
      return jsonResponse(403, {
        success: false,
        error: 'Forbidden: insufficient permissions to send invitations for this project',
      });
    }

    const invitedByName =
      callerProfile?.displayName || callerProfile?.companyName || 'PaperWorking User';
    const token = generateInvitationToken();
    const record = buildInvitationRecord({
      projectId: validated.projectId,
      dealName: (typeof body.dealName === 'string' && body.dealName) || project.propertyName || 'Untitled Deal',
      organizationId: project.organizationId,
      email: validated.email,
      name: validated.name,
      proposedEquityPercent: validated.proposedEquityPercent,
      proposedAmount: validated.proposedAmount,
      invitedByUid: auth.uid,
      invitedByName,
      token,
    });

    const invitationId = deps.persistInvitation
      ? (await deps.persistInvitation(record)).invitationId
      : String(record.id);

    const inviteUrl = buildInviteUrl(token, deps.appUrl);

    return jsonResponse(200, {
      success: true,
      invitationId,
      inviteUrl,
      message: `Invitation successfully logged for ${validated.email}`,
    });
  } catch (error: unknown) {
    console.error('[Invitations] Error creating invitation', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
