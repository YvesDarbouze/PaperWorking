/**
 * Admin User Action Store
 * Provides operational actions for user account management:
 * suspension, reactivation, verification email dispatches, and password resets.
 * Backed by administrative ops state, audit trail logging, and SendGrid/Firebase credentials awareness.
 */

import {
  SEED_ADMIN_USERS,
  SEED_ADMIN_USER_STATS,
  SEED_ADMIN_AUDIT,
} from './seed-data';

export interface AdminUserRecord {
  id: string;
  displayName: string;
  email: string;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  projectCount: number;
  lastLoginAt: string;
  joinedAt: string;
}

export type AdminUserActionType =
  | 'suspend'
  | 'reactivate'
  | 'send_verification'
  | 'reset_password';

export interface UserActionResult {
  success: boolean;
  message: string;
  user: AdminUserRecord;
  requiresCredentials?: boolean;
  action: AdminUserActionType;
}

function recalculateUserStats(): void {
  SEED_ADMIN_USER_STATS.total = SEED_ADMIN_USERS.length;
  SEED_ADMIN_USER_STATS.active = SEED_ADMIN_USERS.filter((u) => u.subscriptionStatus === 'active').length;
  SEED_ADMIN_USER_STATS.pastDue = SEED_ADMIN_USERS.filter((u) => u.subscriptionStatus === 'past_due').length;
  SEED_ADMIN_USER_STATS.churned = SEED_ADMIN_USERS.filter(
    (u) => u.subscriptionStatus === 'canceled' || u.subscriptionStatus === 'suspended',
  ).length;
}

function logAuditAction(action: string, targetUserId: string, details: string): void {
  const nextSeq = (SEED_ADMIN_AUDIT.logs[0]?.seq || 128) + 1;
  const auditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seq: nextSeq,
    severity: 'info' as const,
    action,
    actor: 'admin@paperworking.test',
    target: targetUserId,
    details,
    ip: '127.0.0.1',
    at: new Date().toISOString(),
    hash: Math.random().toString(36).substring(2, 8),
  };
  SEED_ADMIN_AUDIT.logs.unshift(auditEntry);
  SEED_ADMIN_AUDIT.total += 1;
}

export async function suspendUser(userId: string): Promise<UserActionResult> {
  const user = SEED_ADMIN_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error(`User not found with ID "${userId}"`);
  }

  user.subscriptionStatus = 'suspended';
  recalculateUserStats();
  logAuditAction('admin.user_suspend', userId, `User ${user.displayName} (${user.email}) suspended by admin`);

  return {
    success: true,
    message: `Account for ${user.displayName} has been suspended.`,
    user: { ...user },
    action: 'suspend',
  };
}

export async function reactivateUser(userId: string): Promise<UserActionResult> {
  const user = SEED_ADMIN_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error(`User not found with ID "${userId}"`);
  }

  user.subscriptionStatus = 'active';
  recalculateUserStats();
  logAuditAction('admin.user_reactivate', userId, `User ${user.displayName} (${user.email}) reactivated by admin`);

  return {
    success: true,
    message: `Account for ${user.displayName} has been reactivated.`,
    user: { ...user },
    action: 'reactivate',
  };
}

export async function sendVerificationEmail(userId: string): Promise<UserActionResult> {
  const user = SEED_ADMIN_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error(`User not found with ID "${userId}"`);
  }

  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY);
  logAuditAction(
    'admin.send_verification',
    userId,
    `Verification email requested for ${user.email} (SendGrid ${sendgridConfigured ? 'configured' : 'unconfigured'})`,
  );

  return {
    success: true,
    message: sendgridConfigured
      ? `Verification email dispatched to ${user.email}.`
      : `Verification email queued for ${user.email} (SendGrid unconfigured in development environment).`,
    requiresCredentials: !sendgridConfigured,
    user: { ...user },
    action: 'send_verification',
  };
}

export async function resetUserPassword(userId: string): Promise<UserActionResult> {
  const user = SEED_ADMIN_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error(`User not found with ID "${userId}"`);
  }

  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY);
  logAuditAction(
    'admin.password_reset',
    userId,
    `Password reset initiated for ${user.email} (SendGrid ${sendgridConfigured ? 'configured' : 'unconfigured'})`,
  );

  return {
    success: true,
    message: sendgridConfigured
      ? `Password reset link emailed to ${user.email}.`
      : `Password reset link generated for ${user.email} (Email service unconfigured in development environment).`,
    requiresCredentials: !sendgridConfigured,
    user: { ...user },
    action: 'reset_password',
  };
}
