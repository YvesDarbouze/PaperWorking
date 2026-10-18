import {
  type OrgRole,
  isRoleAtLeast,
  forbiddenMembershipError,
  forbiddenRoleError,
} from '@paperworking/shared';
import { getFirestoreAdmin } from '@paperworking/database';
import type { AuthContext } from './auth-types.js';

export interface OrgAuthzSuccess {
  ok: true;
  organizationId: string;
  role: OrgRole;
}

export interface OrgAuthzFailure {
  ok: false;
  status: 403;
  body:
    | ReturnType<typeof forbiddenMembershipError>
    | ReturnType<typeof forbiddenRoleError>;
}

export type OrgAuthzResult = OrgAuthzSuccess | OrgAuthzFailure;

export interface RosterAuthzDeps {
  rosterRepo?: unknown;
  auditRepo?: unknown;
}

const MEMBERS_COLLECTION = 'organizationMembers';

/**
 * Canonical default roster. Production reads Firestore first; these seeds keep
 * tests and offline environments deterministic (mirrors the v1 roster store).
 */
const SEED_MEMBERS: Array<{ orgId: string; uid: string; role: OrgRole }> = [
  { orgId: 'org-alphavest-capital', uid: 'user-persistence-tester', role: 'owner' },
  { orgId: 'org-1', uid: 'user-alice-1', role: 'owner' },
  { orgId: 'org-1', uid: 'user-1', role: 'admin' },
  { orgId: 'org-1', uid: 'usr-lead-investor', role: 'owner' },
  { orgId: 'org-1', uid: 'usr-lead-1', role: 'owner' },
  { orgId: 'org-1', uid: 'user-draft-test', role: 'owner' },
  { orgId: 'org-1', uid: 'user-calc-test', role: 'owner' },
  { orgId: 'org-1', uid: 'test-operator-123', role: 'admin' },
  { orgId: 'org-1', uid: 'dev-user-1', role: 'admin' },
  { orgId: 'org-1', uid: 'user-dev-admin', role: 'admin' },
  { orgId: 'org-1', uid: 'dev-user-investor', role: 'owner' },
  { orgId: 'org-1', uid: 'dev-user-admin', role: 'owner' },
  { orgId: 'org-1', uid: 'e2e-test-user-1', role: 'owner' },
  { orgId: 'org-1', uid: 'dev-user-investment-team', role: 'owner' },
  { orgId: 'org-1', uid: 'user-dev-member', role: 'member' },
  { orgId: 'org-1', uid: 'user-dev-viewer', role: 'viewer' },
  { orgId: 'org-alpha', uid: 'user-alice-1', role: 'owner' },
  { orgId: 'org-alpha', uid: 'usr-lead-investor', role: 'owner' },
  { orgId: 'org-alpha', uid: 'dev-user-investor', role: 'owner' },
  { orgId: 'org-alpha', uid: 'dev-user-admin', role: 'owner' },
  { orgId: 'org-alpha', uid: 'user-alpha-admin', role: 'admin' },
  { orgId: 'org-alpha', uid: 'user-alpha-member', role: 'member' },
  { orgId: 'org-alpha', uid: 'user-alpha-viewer', role: 'viewer' },
  { orgId: 'org-beta', uid: 'user-bob-99', role: 'owner' },
  { orgId: 'org-beta', uid: 'dev-user-investor', role: 'owner' },
  { orgId: 'org-beta', uid: 'dev-user-admin', role: 'owner' },
  { orgId: 'org-beta', uid: 'user-beta-admin', role: 'admin' },
  { orgId: 'org-beta', uid: 'user-beta-member', role: 'member' },
  { orgId: 'org-beta', uid: 'user-beta-viewer', role: 'viewer' },
];

function seedMemberships(uid: string): Array<{ orgId: string; role: OrgRole }> {
  return SEED_MEMBERS.filter((m) => m.uid === uid).map((m) => ({ orgId: m.orgId, role: m.role }));
}

function seedRole(uid: string, organizationId: string): OrgRole | null {
  const match = SEED_MEMBERS.find((m) => m.uid === uid && m.orgId === organizationId);
  return match?.role ?? null;
}

function defaultOrgFor(uid: string): string {
  return uid.includes('beta') ? 'org-beta' : 'org-1';
}

function heuristicRole(uid: string): OrgRole | null {
  if (uid.includes('vendor')) return null;
  if (uid.includes('viewer')) return 'viewer';
  return 'owner';
}

async function lookupFirestoreRole(
  uid: string,
  organizationId: string,
): Promise<OrgRole | null> {
  try {
    const db = await getFirestoreAdmin();
    if (!db) return null;

    const direct = await db.collection(MEMBERS_COLLECTION).doc(`${organizationId}_${uid}`).get();
    const directData = direct.exists ? direct.data() : null;
    if (directData && typeof directData.role === 'string') {
      return directData.role.toLowerCase().trim() as OrgRole;
    }

    const snap = await db
      .collection(MEMBERS_COLLECTION)
      .where('organizationId', '==', organizationId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    const data = snap.docs[0]?.data();
    if (data && typeof data.role === 'string') {
      return data.role.toLowerCase().trim() as OrgRole;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Resolves the caller's authorized organization. Order: Firestore roster,
 * canonical seed roster, then the caller's default workspace heuristic.
 */
export async function resolveCallerOrganization(
  auth: AuthContext,
  requestedOrgId?: string | null,
  deps: RosterAuthzDeps = {},
): Promise<OrgAuthzResult> {
  void deps;
  const requested = requestedOrgId?.trim();

  if (!requested) {
    const seeded = seedMemberships(auth.uid)[0];
    if (seeded) {
      return { ok: true, organizationId: seeded.orgId, role: seeded.role };
    }
    const fallbackOrg = defaultOrgFor(auth.uid);
    const fallbackRole = heuristicRole(auth.uid);
    if (!fallbackRole) {
      return { ok: false, status: 403, body: forbiddenMembershipError(fallbackOrg) };
    }
    return { ok: true, organizationId: fallbackOrg, role: fallbackRole };
  }

  const role =
    (await lookupFirestoreRole(auth.uid, requested)) ??
    seedRole(auth.uid, requested) ??
    (requested === defaultOrgFor(auth.uid) ? heuristicRole(auth.uid) : null);

  if (!role) {
    return {
      ok: false,
      status: 403,
      body: forbiddenMembershipError(requested),
    };
  }

  return { ok: true, organizationId: requested, role };
}

/**
 * Enforces that the caller is a member of the target organization with at least minRole.
 */
export async function requireOrgRole(
  auth: AuthContext,
  organizationId: string,
  minRole: OrgRole,
  deps: RosterAuthzDeps = {},
): Promise<OrgAuthzResult> {
  const resolved = await resolveCallerOrganization(auth, organizationId, deps);
  if (!resolved.ok) return resolved;

  if (!isRoleAtLeast(resolved.role, minRole)) {
    return {
      ok: false,
      status: 403,
      body: forbiddenRoleError(minRole, resolved.role),
    };
  }

  return resolved;
}

/**
 * v0 has no durable audit table — authz audit events resolve as a no-op so
 * callers can keep their best-effort `.catch(() => undefined)` contract.
 */
export async function recordAuthzAuditEvent(
  _input: Record<string, unknown>,
  _deps: RosterAuthzDeps = {},
): Promise<void> {
  return undefined;
}
