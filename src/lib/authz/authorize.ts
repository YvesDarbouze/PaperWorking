import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logAdminAudit } from '@/lib/audit/auditLogger';

/** __session may hold a Firebase session cookie or a raw ID token (session route fallback). */
async function verifySessionOrIdToken(sessionToken: string): Promise<DecodedIdToken> {
  try {
    return await adminAuth.verifySessionCookie(sessionToken);
  } catch {
    return await adminAuth.verifyIdToken(sessionToken);
  }
}

export type AdminAction =
  | 'admin:view_overview'
  | 'admin:view_users'
  | 'admin:manage_users'
  | 'admin:view_subscriptions'
  | 'admin:manage_subscriptions'
  | 'admin:view_marketplace'
  | 'admin:view_analytics'
  | 'admin:view_tickets'
  | 'admin:manage_tickets'
  | 'admin:view_audit_logs'
  | 'admin:export_audit_logs'
  | 'admin:manage_agents'
  | 'admin:manage_roles'
  | 'admin:purge_data';

export interface AuthzUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string;
  customClaimsRole?: string;
  firestoreRole?: string;
}

export interface AuthzContext {
  ipAddress?: string;
  userAgent?: string;
  targetResource?: string;
  targetResourceId?: string;
}

export interface AuthzResult {
  authorized: boolean;
  user?: AuthzUser;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<string, AdminAction[]> = {
  'Platform Admin': [
    'admin:view_overview',
    'admin:view_users',
    'admin:manage_users',
    'admin:view_subscriptions',
    'admin:manage_subscriptions',
    'admin:view_marketplace',
    'admin:view_analytics',
    'admin:view_tickets',
    'admin:manage_tickets',
    'admin:view_audit_logs',
    'admin:export_audit_logs',
    'admin:manage_agents',
    'admin:manage_roles',
    'admin:purge_data',
  ],
  Admin: [
    'admin:view_overview',
    'admin:view_users',
    'admin:view_subscriptions',
    'admin:view_marketplace',
    'admin:view_analytics',
    'admin:view_tickets',
    'admin:manage_tickets',
    'admin:view_audit_logs',
    'admin:export_audit_logs',
  ],
  'Lead Investor': [
    'admin:view_overview',
    'admin:view_marketplace',
    'admin:view_analytics',
  ],
};

/**
 * Server-side authorization verification service.
 * Verifies Firebase session cookie or ID token, checks custom claims vs Firestore profile role,
 * logs mismatches/denials, and verifies required permission against role matrix.
 */
export async function authorize(
  idToken: string | null | undefined,
  requiredAction: AdminAction,
  context: AuthzContext = {}
): Promise<AuthzResult> {
  const ipAddress = context.ipAddress || '127.0.0.1';
  const targetResource = context.targetResource || 'admin_panel';

  if (!idToken) {
    await logAdminAudit({
      actorUid: 'anonymous',
      actorEmail: 'unknown',
      actorRole: 'none',
      action: requiredAction,
      targetResource,
      targetResourceId: context.targetResourceId,
      status: 'DENIED',
      ipAddress,
      userAgent: context.userAgent,
      reasonCode: 'unauthenticated',
      severity: 'warning',
    });

    return { authorized: false, reason: 'unauthenticated' };
  }

  try {
    // 1. Verify Firebase session cookie or ID token from __session
    const decodedToken = await verifySessionOrIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    const claimsRole = (decodedToken.role as string) || '';

    // 2. Fetch Firestore User Document
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const firestoreRole = userData?.role || userData?.profile?.role || '';

    const effectiveRole = firestoreRole || claimsRole || 'investor';

    // 3. Fail closed if custom claims role and Firestore role disagree (when both exist)
    if (claimsRole && firestoreRole && claimsRole !== firestoreRole) {
      await logAdminAudit({
        actorUid: uid,
        actorEmail: email,
        actorRole: effectiveRole,
        action: 'authz.role_mismatch',
        targetResource,
        targetResourceId: context.targetResourceId,
        status: 'DENIED',
        ipAddress,
        userAgent: context.userAgent,
        reasonCode: 'role_mismatch',
        severity: 'warning',
        metadata: {
          claimsRole,
          firestoreRole,
        },
      });

      return { authorized: false, reason: 'role_mismatch' };
    }

    const userObj: AuthzUser = {
      uid,
      email,
      role: effectiveRole,
      displayName: userData?.displayName || userData?.name || email,
      customClaimsRole: claimsRole,
      firestoreRole,
    };

    // 4. Check role permissions
    const allowedActions = ROLE_PERMISSIONS[effectiveRole] || [];
    const isAuthorized = allowedActions.includes(requiredAction);

    if (!isAuthorized) {
      await logAdminAudit({
        actorUid: uid,
        actorEmail: email,
        actorRole: effectiveRole,
        action: requiredAction,
        targetResource,
        targetResourceId: context.targetResourceId,
        status: 'DENIED',
        ipAddress,
        userAgent: context.userAgent,
        reasonCode: 'insufficient_permissions',
        severity: 'warning',
      });

      return { authorized: false, user: userObj, reason: 'insufficient_permissions' };
    }

    return { authorized: true, user: userObj };
  } catch (error) {
    console.error('[Authorize] Token verification failed:', error);

    await logAdminAudit({
      actorUid: 'unknown',
      actorEmail: 'unknown',
      actorRole: 'none',
      action: requiredAction,
      targetResource,
      targetResourceId: context.targetResourceId,
      status: 'DENIED',
      ipAddress,
      userAgent: context.userAgent,
      reasonCode: 'token_verification_failed',
      severity: 'warning',
    });

    return { authorized: false, reason: 'token_verification_failed' };
  }
}

/**
 * Dual-control role change service for granting Platform Admin super-role.
 * Requires confirmation from a second existing Platform Admin.
 */
export async function executeRoleChange(params: {
  idToken: string;
  targetUid: string;
  newRole: string;
  secondApproverUid?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> {
  const authz = await authorize(params.idToken, 'admin:manage_roles', {
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    targetResource: 'users',
    targetResourceId: params.targetUid,
  });

  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  // Dual-control rule: granting Platform Admin requires second Platform Admin approval
  if (params.newRole === 'Platform Admin') {
    if (!params.secondApproverUid) {
      return {
        success: false,
        error: 'Dual-control confirmation required: granting Platform Admin requires a second Platform Admin approval.',
      };
    }

    // Verify second approver exists and is a Platform Admin
    const secondSnap = await adminDb.collection('users').doc(params.secondApproverUid).get();
    const secondData = secondSnap.data();
    if (secondData?.role !== 'Platform Admin') {
      return {
        success: false,
        error: 'Invalid second approver: must be an active Platform Admin.',
      };
    }
  }

  // Execute role update in Firestore profile & Firebase Auth custom claims
  const targetRef = adminDb.collection('users').doc(params.targetUid);
  const targetSnap = await targetRef.get();
  const targetData = targetSnap.data();
  const oldRole = targetData?.role || 'none';

  await targetRef.set({ role: params.newRole, updatedAt: new Date() }, { merge: true });
  await adminAuth.setCustomUserClaims(params.targetUid, { role: params.newRole });

  // Log dual-control role grant to immutable audit log
  await logAdminAudit({
    actorUid: authz.user.uid,
    actorEmail: authz.user.email,
    actorRole: authz.user.role,
    action: 'admin:change_role',
    targetResource: 'users',
    targetResourceId: params.targetUid,
    status: 'SUCCESS',
    ipAddress: params.ipAddress || '127.0.0.1',
    userAgent: params.userAgent,
    severity: 'critical',
    metadata: {
      oldRole,
      newRole: params.newRole,
      secondApproverUid: params.secondApproverUid || null,
      dualControlEnforced: params.newRole === 'Platform Admin',
    },
  });

  return { success: true };
}
