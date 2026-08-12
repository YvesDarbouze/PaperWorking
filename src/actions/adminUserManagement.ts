'use server';

import { cookies } from 'next/headers';
import { authorize } from '@/lib/authz/authorize';
import { logAdminAudit } from '@/lib/audit/auditLogger';
import { fetchUser360Data, User360Data } from '@/lib/admin/user360';
import {
  initiateSensitiveActionVerification,
  confirmSensitiveActionVerification,
  SensitiveActionType,
  InitiationResult,
  ConfirmationResult,
} from '@/lib/admin/verificationGate';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('__session')?.value || null;
  } catch {
    return null;
  }
}

/**
 * Server action to fetch federated User 360 profile data.
 */
export async function getUser360(targetUid: string): Promise<User360Data | null> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_users');
  if (!authz.authorized) return null;

  return await fetchUser360Data(targetUid);
}

/**
 * Server action to initiate sensitive action verification (Email Change, Password Reset, MFA Reset).
 */
export async function requestSensitiveUserAction(params: {
  targetUid: string;
  actionType: SensitiveActionType;
  newEmail?: string;
}): Promise<InitiationResult> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_users');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  return await initiateSensitiveActionVerification({
    targetUid: params.targetUid,
    actionType: params.actionType,
    adminUid: authz.user.uid,
    adminEmail: authz.user.email,
    newEmail: params.newEmail,
  });
}

/**
 * Server action to confirm 6-digit verification code and execute sensitive action.
 */
export async function confirmSensitiveUserAction(params: {
  verificationId: string;
  code: string;
}): Promise<ConfirmationResult> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_users');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  return await confirmSensitiveActionVerification({
    verificationId: params.verificationId,
    code: params.code,
    adminUid: authz.user.uid,
    adminEmail: authz.user.email,
  });
}

/**
 * Server action to enable or disable a user account in Firebase Auth.
 */
export async function toggleUserAccountStatus(params: {
  targetUid: string;
  disabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:manage_users');
  if (!authz.authorized || !authz.user) {
    return { success: false, error: authz.reason || 'Unauthorized' };
  }

  try {
    await adminAuth.updateUser(params.targetUid, { disabled: params.disabled });
    await adminDb.collection('users').doc(params.targetUid).set({ disabled: params.disabled, updatedAt: new Date() }, { merge: true });

    await logAdminAudit({
      actorUid: authz.user.uid,
      actorEmail: authz.user.email,
      actorRole: authz.user.role,
      action: params.disabled ? 'admin:disable_user' : 'admin:enable_user',
      targetResource: 'users',
      targetResourceId: params.targetUid,
      status: 'SUCCESS',
      severity: 'warning',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Toggle status failed' };
  }
}

/**
 * Server action to bulk export selected user records to CSV.
 */
export async function exportSelectedUsersCSV(targetUids: string[]): Promise<{ csvData: string; error?: string }> {
  const token = await getSessionToken();
  const authz = await authorize(token, 'admin:view_users');
  if (!authz.authorized) {
    return { csvData: '', error: authz.reason || 'Unauthorized' };
  }

  try {
    const headers = ['UID', 'Name', 'Email', 'Role', 'Account Type', 'Subscription Plan', 'Status', 'Joined Date'];
    const rows: string[][] = [];

    for (const uid of targetUids) {
      const u360 = await fetchUser360Data(uid);
      if (u360) {
        rows.push([
          u360.identity.uid,
          u360.identity.displayName,
          u360.identity.email,
          u360.identity.role,
          u360.identity.accountType,
          u360.billing.subscriptionPlan,
          u360.billing.subscriptionStatus,
          u360.identity.createdAt,
        ]);
      }
    }

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return { csvData: csvContent };
  } catch (error: any) {
    return { csvData: '', error: error?.message || 'Export failed' };
  }
}
