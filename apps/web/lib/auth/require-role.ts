import { NextResponse } from 'next/server';
import {
  resolveCallerOrganization,
  requireOrgRole,
  recordAuthzAuditEvent,
  type RosterAuthzDeps,
} from '@paperworking/api';
import { type OrgRole, normalizeToStructuredError } from '@paperworking/shared';

export {
  resolveCallerOrganization,
  requireOrgRole,
  recordAuthzAuditEvent,
  type OrgRole,
};

export interface WebOrgAuthzSuccess {
  ok: true;
  organizationId: string;
  role: OrgRole;
}

export interface WebOrgAuthzFailure {
  ok: false;
  response: NextResponse;
}

export type WebOrgAuthzResult = WebOrgAuthzSuccess | WebOrgAuthzFailure;

export async function resolveWebCallerOrg(
  auth: { uid: string; email?: string | null },
  requestedOrgId?: string | null,
  deps: RosterAuthzDeps = {},
): Promise<WebOrgAuthzResult> {
  const res = await resolveCallerOrganization(auth, requestedOrgId, deps);
  if (!res.ok) {
    const structured = normalizeToStructuredError(res.body, res.status);
    return {
      ok: false,
      response: NextResponse.json(
        {
          ...structured,
          code: structured.error.code,
        },
        { status: res.status },
      ),
    };
  }
  return {
    ok: true,
    organizationId: res.organizationId,
    role: res.role,
  };
}

export async function requireWebOrgRole(
  auth: { uid: string; email?: string | null },
  organizationId: string,
  minRole: OrgRole,
  deps: RosterAuthzDeps = {},
): Promise<WebOrgAuthzResult> {
  const res = await requireOrgRole(auth, organizationId, minRole, deps);
  if (!res.ok) {
    const structured = normalizeToStructuredError(res.body, res.status);
    const bodyObj = res.body && typeof res.body === 'object' ? (res.body as Record<string, unknown>) : {};
    return {
      ok: false,
      response: NextResponse.json(
        {
          ...structured,
          code: structured.error.code,
          ...(typeof bodyObj.requiredRole === 'string' ? { requiredRole: bodyObj.requiredRole } : {}),
        },
        { status: res.status },
      ),
    };
  }
  return {
    ok: true,
    organizationId: res.organizationId,
    role: res.role,
  };
}

export async function recordWebAuditEvent(
  input: {
    organizationId?: string | null;
    projectId?: string | null;
    actorUid: string;
    actorEmail?: string | null;
    actorRole?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    fromState?: unknown;
    toState?: unknown;
    metadata?: unknown;
  },
  deps: RosterAuthzDeps = {},
) {
  return recordAuthzAuditEvent(input, deps);
}
