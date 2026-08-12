import crypto from 'crypto';
import { Resend } from 'resend';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { logAdminAudit } from '@/lib/audit/auditLogger';

export type SensitiveActionType = 'EMAIL_CHANGE' | 'PASSWORD_RESET' | 'MFA_RESET';

export interface InitiationResult {
  success: boolean;
  verificationId?: string;
  expiresAt?: string;
  error?: string;
}

export interface ConfirmationResult {
  success: boolean;
  message?: string;
  error?: string;
}

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Initiates verification-before-change gate for sensitive admin actions (Amendment E).
 * Generates a 6-digit OTP code, stores it with a 15-minute TTL, and emails the user via Resend.
 */
export async function initiateSensitiveActionVerification(params: {
  targetUid: string;
  actionType: SensitiveActionType;
  adminUid: string;
  adminEmail: string;
  newEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<InitiationResult> {
  try {
    // Fetch target user email
    let targetEmail = '';
    try {
      const userRecord = await adminAuth.getUser(params.targetUid);
      targetEmail = userRecord.email || '';
    } catch {
      const doc = await adminDb.collection('users').doc(params.targetUid).get();
      targetEmail = doc.data()?.email || '';
    }

    if (!targetEmail) {
      return { success: false, error: 'Target user email not found' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    const verificationId = crypto.randomUUID();

    // Store verification code in Firestore
    await adminDb.collection('verification_codes').doc(verificationId).set({
      verificationId,
      targetUid: params.targetUid,
      targetEmail,
      actionType: params.actionType,
      code,
      newEmail: params.newEmail || null,
      adminUid: params.adminUid,
      createdAt: new Date(),
      expiresAt,
      used: false,
    });

    // Send code via Resend Communication Engine
    const resend = getResendClient();
    if (resend) {
      const actionName = params.actionType === 'EMAIL_CHANGE' ? 'Email Address Change' : params.actionType === 'PASSWORD_RESET' ? 'Password Reset' : 'MFA Reset';
      await resend.emails.send({
        from: 'PaperWorking Security <security@paperworking.co>',
        to: targetEmail,
        subject: `Security Verification Code: ${actionName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h2 style="color: #0d0d0d; margin-top: 0;">Security Verification Request</h2>
            <p style="color: #454955; font-size: 14px;">An administrative action <strong>(${actionName})</strong> was requested for your PaperWorking account.</p>
            <p style="color: #454955; font-size: 14px;">To authorize this change, provide the following 6-digit verification code to your administrator:</p>
            <div style="background: #f4f4f5; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0d0d0d;">${code}</span>
            </div>
            <p style="color: #888; font-size: 12px;">This code will expire in 15 minutes. If you did not request this, please contact PaperWorking Security immediately.</p>
          </div>
        `,
      });
    }

    // Log initiation to audit log
    await logAdminAudit({
      actorUid: params.adminUid,
      actorEmail: params.adminEmail,
      actorRole: 'Platform Admin',
      action: `admin:initiate_${params.actionType.toLowerCase()}`,
      targetResource: 'users',
      targetResourceId: params.targetUid,
      status: 'SUCCESS',
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent,
      severity: 'warning',
      metadata: {
        verificationId,
        actionType: params.actionType,
        targetEmail,
        newEmail: params.newEmail || null,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      success: true,
      verificationId,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    console.error('[initiateSensitiveActionVerification] Failed:', error);
    return { success: false, error: error?.message || 'Initiation failed' };
  }
}

/**
 * Confirms verification code and executes sensitive account mutation (Amendment E).
 */
export async function confirmSensitiveActionVerification(params: {
  verificationId: string;
  code: string;
  adminUid: string;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ConfirmationResult> {
  try {
    const codeRef = adminDb.collection('verification_codes').doc(params.verificationId);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
      return { success: false, error: 'Verification session not found' };
    }

    const data = codeSnap.data();
    if (!data || data.used) {
      return { success: false, error: 'Verification code has already been used' };
    }

    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      return { success: false, error: 'Verification code has expired (15-min limit exceeded)' };
    }

    if (data.code !== params.code.trim()) {
      return { success: false, error: 'Invalid verification code' };
    }

    const targetUid = data.targetUid;
    const actionType: SensitiveActionType = data.actionType;

    // Execute requested mutation
    if (actionType === 'EMAIL_CHANGE') {
      if (!data.newEmail) return { success: false, error: 'New email address missing' };
      await adminAuth.updateUser(targetUid, { email: data.newEmail, emailVerified: false });
      await adminDb.collection('users').doc(targetUid).set({ email: data.newEmail, updatedAt: new Date() }, { merge: true });
    } else if (actionType === 'PASSWORD_RESET') {
      const resetLink = await adminAuth.generatePasswordResetLink(data.targetEmail);
      const resend = getResendClient();
      if (resend) {
        await resend.emails.send({
          from: 'PaperWorking Security <security@paperworking.co>',
          to: data.targetEmail,
          subject: 'Password Reset Link',
          html: `<p>Your administrator has generated a password reset link for your account:</p><p><a href="${resetLink}">Reset Password</a></p>`,
        });
      }
    } else if (actionType === 'MFA_RESET') {
      await adminAuth.revokeRefreshTokens(targetUid);
      await adminDb.collection('users').doc(targetUid).set({ mfaEnabled: false, updatedAt: new Date() }, { merge: true });
    }

    // Mark code as used
    await codeRef.update({ used: true, confirmedAt: new Date() });

    // Log execution to audit log
    await logAdminAudit({
      actorUid: params.adminUid,
      actorEmail: params.adminEmail,
      actorRole: 'Platform Admin',
      action: `admin:confirm_${actionType.toLowerCase()}`,
      targetResource: 'users',
      targetResourceId: targetUid,
      status: 'SUCCESS',
      ipAddress: params.ipAddress || '127.0.0.1',
      userAgent: params.userAgent,
      severity: 'critical',
      metadata: {
        verificationId: params.verificationId,
        actionType,
        targetUid,
        newEmail: data.newEmail || null,
      },
    });

    return {
      success: true,
      message: `Action ${actionType} successfully verified and executed.`,
    };
  } catch (error: any) {
    console.error('[confirmSensitiveActionVerification] Failed:', error);
    return { success: false, error: error?.message || 'Confirmation failed' };
  }
}
