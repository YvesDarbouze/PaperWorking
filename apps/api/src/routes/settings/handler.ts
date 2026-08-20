import {
  binaryResponse,
  jsonResponse,
  type RouteResult,
} from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  buildBillingSettingsResponse,
  buildDataPrivacyExportAttachment,
  buildIntegrationConnectUpdates,
  buildIntegrationDisconnectUpdates,
  buildProfileResponse,
  buildProfileUpdate,
  buildSecuritySettingsResponse,
  buildWorkspaceSettingsResponse,
  DEFAULT_NOTIFICATION_PREFERENCES,
  parseSettingsSection,
  scheduleWorkspaceDeletionTimestamp,
  validateBillingContactUpdate,
  validateWorkspaceDeletionConfirm,
} from '../../lib/settings/sections.js';
import { TEAM_SETTINGS_ROLES } from '../../lib/team/helpers.js';

export type LoadSettingsUserFn = (uid: string) => Promise<Record<string, unknown>>;
export type LoadSettingsOrgFn = (orgId: string) => Promise<Record<string, unknown>>;
export type UpdateSettingsUserFn = (
  uid: string,
  patch: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type UpdateSettingsOrgFn = (
  orgId: string,
  patch: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type ListSettingsTeamFn = (orgId: string) => Promise<{
  members: Array<Record<string, unknown>>;
  invites: Array<Record<string, unknown>>;
}>;
export type CreateSettingsTeamInviteFn = (
  orgId: string,
  email: string,
  role: string,
) => Promise<void>;
export type RemoveSettingsTeamMemberFn = (memberId: string) => Promise<void>;
export type ListConnectedIntegrationsFn = (
  orgId: string,
  userData: Record<string, unknown>,
) => Promise<string[]>;

export interface SettingsHandlerDeps {
  requireAuth?: RequireAuthFn;
  loadUser?: LoadSettingsUserFn;
  loadOrg?: LoadSettingsOrgFn;
  updateUser?: UpdateSettingsUserFn;
  updateOrg?: UpdateSettingsOrgFn;
  listTeam?: ListSettingsTeamFn;
  createTeamInvite?: CreateSettingsTeamInviteFn;
  removeTeamMember?: RemoveSettingsTeamMemberFn;
  listConnectedIntegrations?: ListConnectedIntegrationsFn;
  resolveOrgId?: (user: Record<string, unknown>) => string;
  isE2eTest?: (headers: Record<string, string | undefined>) => boolean;
  buildE2eUser?: (headers: Record<string, string | undefined>) => Record<string, unknown>;
}

function resolveOrgId(user: Record<string, unknown>, deps: SettingsHandlerDeps): string {
  if (deps.resolveOrgId) return deps.resolveOrgId(user);
  return String(user.organizationId || 'org_placeholder');
}

/**
 * GET /api/settings/*
 */
export async function handleSettingsGet(
  sectionPath: string[],
  query: { id?: string | null },
  headers: Record<string, string | undefined> = {},
  deps: SettingsHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const { section, subAction } = parseSettingsSection(sectionPath);
  const user =
    deps.isE2eTest?.(headers) && deps.buildE2eUser
      ? deps.buildE2eUser(headers)
      : deps.loadUser
        ? await deps.loadUser(auth.uid)
        : {};
  const orgId = resolveOrgId(user, deps);

  if (section === 'profile') {
    return jsonResponse(200, buildProfileResponse(user));
  }

  if (section === 'billing') {
    return jsonResponse(200, buildBillingSettingsResponse(user));
  }

  if (section === 'team') {
    if (!orgId || orgId === 'org_placeholder') {
      return jsonResponse(200, { members: [], invites: [], roles: [...TEAM_SETTINGS_ROLES] });
    }
    const team = deps.listTeam
      ? await deps.listTeam(orgId)
      : { members: [], invites: [] };
    return jsonResponse(200, { ...team, roles: [...TEAM_SETTINGS_ROLES] });
  }

  if (section === 'workspace') {
    const org = deps.loadOrg ? await deps.loadOrg(orgId) : {};
    return jsonResponse(200, buildWorkspaceSettingsResponse(org));
  }

  if (section === 'security') {
    const org = deps.loadOrg ? await deps.loadOrg(orgId) : {};
    return jsonResponse(200, buildSecuritySettingsResponse(org));
  }

  if (section === 'data-privacy') {
    if (subAction === 'download-export') {
      const exportId = query.id || 'export';
      const attachment = buildDataPrivacyExportAttachment(orgId, exportId);
      return binaryResponse(200, attachment.content, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
      });
    }
    const org = deps.loadOrg ? await deps.loadOrg(orgId) : {};
    return jsonResponse(200, {
      exports: org.exports || [],
      activeExportJob: org.activeExportJob || null,
      deletionScheduledAt: org.deletionScheduledAt || null,
    });
  }

  if (section === 'integrations') {
    const connectedApps = deps.listConnectedIntegrations
      ? await deps.listConnectedIntegrations(orgId, user)
      : [];
    return jsonResponse(200, { connectedApps });
  }

  if (section === 'notifications') {
    return jsonResponse(200, {
      preferences: user.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES,
    });
  }

  return jsonResponse(404, { error: 'Section not found' });
}

/**
 * PUT /api/settings/*
 */
export async function handleSettingsPut(
  sectionPath: string[],
  body: Record<string, unknown>,
  deps: SettingsHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const { section, subAction } = parseSettingsSection(sectionPath);
  const user = deps.loadUser ? await deps.loadUser(auth.uid) : {};
  const orgId = resolveOrgId(user, deps);

  if (section === 'profile') {
    const update = buildProfileUpdate(body);
    const updated = deps.updateUser
      ? await deps.updateUser(auth.uid, update)
      : { ...user, ...update };
    return jsonResponse(200, {
      ...buildProfileResponse({ ...user, ...updated }),
      name: update.displayName,
      phone: update.phone,
      companyName: update.companyName,
      avatar: update.avatar ?? user.avatar ?? '',
    });
  }

  if (section === 'billing') {
    const validated = validateBillingContactUpdate(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });
    if (deps.updateUser) await deps.updateUser(auth.uid, validated.update);
    return jsonResponse(200, validated.update);
  }

  if (section === 'workspace') {
    const patch = {
      name: typeof body.name === 'string' ? body.name.slice(0, 100) : '',
      logo: body.logo ?? '',
      timezone: body.timezone ?? 'America/New_York',
      targetCapRate: body.targetCapRate,
      targetCoc: body.targetCoc,
      minDscr: body.minDscr,
      maxPurchasePrice: body.maxPurchasePrice,
    };
    if (deps.updateOrg) await deps.updateOrg(orgId, patch);
    return jsonResponse(200, patch);
  }

  if (section === 'security') {
    const patch = {
      ipAllowlist: body.ipAllowlist ?? '',
      sessionTimeout: body.sessionTimeout ?? '24 hours',
      ssoEnabled: body.ssoEnabled ?? false,
      twoFaRequired: body.twoFaRequired ?? false,
      ssoProvider: body.ssoProvider ?? 'saml',
      samlEntityId: body.samlEntityId ?? '',
      samlSignInUrl: body.samlSignInUrl ?? '',
      samlX509Cert: body.samlX509Cert ?? '',
    };
    if (deps.updateOrg) await deps.updateOrg(orgId, patch);
    return jsonResponse(200, patch);
  }

  if (section === 'notifications') {
    const preferences = body.preferences;
    if (deps.updateUser) await deps.updateUser(auth.uid, { notificationPreferences: preferences });
    return jsonResponse(200, { preferences });
  }

  if (section === 'billing' && subAction === 'payment-methods') {
    const id = body.id;
    const currentMethods = (user.paymentMethods as Array<{ id: string; isDefault?: boolean }>) || [];
    const updatedMethods = currentMethods.map((method) => ({
      ...method,
      isDefault: method.id === id,
    }));
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Section not found' });
}

/**
 * POST /api/settings/*
 */
export async function handleSettingsPost(
  sectionPath: string[],
  body: Record<string, unknown>,
  deps: SettingsHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const { section, subAction } = parseSettingsSection(sectionPath);
  const user = deps.loadUser ? await deps.loadUser(auth.uid) : {};
  const orgId = resolveOrgId(user, deps);

  if (section === 'change-plan') {
    const plan = body.plan;
    if (deps.updateUser) {
      await deps.updateUser(auth.uid, {
        subscriptionPlan: plan,
        subscriptionStatus: plan !== 'None' ? 'active' : 'inactive',
      });
    }
    return jsonResponse(200, { url: '/dashboard/settings/billing?success=true' });
  }

  if (section === 'cancel') {
    if (deps.updateUser) {
      await deps.updateUser(auth.uid, { subscriptionStatus: 'cancellation_pending' });
    }
    const updated = deps.loadUser ? await deps.loadUser(auth.uid) : user;
    return jsonResponse(200, {
      plan: updated.subscriptionPlan || 'None',
      subscriptionStatus: 'cancellation_pending',
      paymentMethods: updated.paymentMethods || [],
      invoices: updated.invoices || [],
    });
  }

  if (section === 'team' && subAction === 'invite') {
    const email = typeof body.email === 'string' ? body.email : '';
    const role = typeof body.role === 'string' ? body.role : '';
    if (deps.createTeamInvite) await deps.createTeamInvite(orgId, email, role);
    return jsonResponse(200, { success: true });
  }

  if (section === 'integrations' && subAction === 'connect') {
    const id = typeof body.id === 'string' ? body.id : '';
    const updates = buildIntegrationConnectUpdates(id);
    if (deps.updateUser) await deps.updateUser(auth.uid, updates);
    return jsonResponse(200, { success: true });
  }

  if (section === 'data-privacy' && subAction === 'export') {
    const activeExportJob = {
      id: `exp_${Date.now()}`,
      status: 'Queued',
      createdAt: new Date().toISOString(),
    };
    if (deps.updateOrg) await deps.updateOrg(orgId, { activeExportJob });
    return jsonResponse(200, { success: true, activeExportJob });
  }

  if (section === 'data-privacy' && subAction === 'delete-workspace') {
    const org = deps.loadOrg ? await deps.loadOrg(orgId) : {};
    const validated = validateWorkspaceDeletionConfirm(body.confirmName, String(org.name || ''));
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });
    const deletionScheduledAt = scheduleWorkspaceDeletionTimestamp();
    if (deps.updateOrg) await deps.updateOrg(orgId, { deletionScheduledAt });
    return jsonResponse(200, { success: true, deletionScheduledAt });
  }

  if (section === 'billing' && subAction === 'payment-methods') {
    const card = (body.card as Record<string, unknown>) || {};
    const currentMethods = (user.paymentMethods as Array<Record<string, unknown>>) || [];
    const newMethod = {
      id: `pm_${Date.now()}`,
      brand: card.brand || 'visa',
      last4: card.last4 || '4242',
      expMonth: card.expMonth || 12,
      expYear: card.expYear || 2028,
      isDefault: currentMethods.length === 0,
    };
    const updatedMethods = [...currentMethods, newMethod];
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Section/Action not found' });
}

/**
 * DELETE /api/settings/*
 */
export async function handleSettingsDelete(
  sectionPath: string[],
  body: Record<string, unknown>,
  deps: SettingsHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const { section, subAction } = parseSettingsSection(sectionPath);
  const user = deps.loadUser ? await deps.loadUser(auth.uid) : {};
  const orgId = resolveOrgId(user, deps);

  if (section === 'team' && subAction === 'remove') {
    const memberId = typeof body.memberId === 'string' ? body.memberId : '';
    if (deps.removeTeamMember) await deps.removeTeamMember(memberId);
    return jsonResponse(200, { success: true });
  }

  if (section === 'integrations' && subAction === 'disconnect') {
    const id = typeof body.id === 'string' ? body.id : '';
    const updates = buildIntegrationDisconnectUpdates(id);
    if (deps.updateUser) await deps.updateUser(auth.uid, updates);
    return jsonResponse(200, { success: true });
  }

  if (section === 'data-privacy' && subAction === 'delete-workspace') {
    if (deps.updateOrg) await deps.updateOrg(orgId, { deletionScheduledAt: null });
    return jsonResponse(200, { success: true, deletionScheduledAt: null });
  }

  if (section === 'billing' && subAction === 'payment-methods') {
    const id = body.id;
    const currentMethods = (user.paymentMethods as Array<{ id: string; isDefault?: boolean }>) || [];
    let updatedMethods = currentMethods.filter((method) => method.id !== id);
    if (updatedMethods.length > 0 && !updatedMethods.some((method) => method.isDefault)) {
      updatedMethods = [{ ...updatedMethods[0], isDefault: true }, ...updatedMethods.slice(1)];
    }
    if (deps.updateUser) await deps.updateUser(auth.uid, { paymentMethods: updatedMethods });
    return jsonResponse(200, { success: true, paymentMethods: updatedMethods });
  }

  return jsonResponse(404, { error: 'Section/Action not found' });
}
