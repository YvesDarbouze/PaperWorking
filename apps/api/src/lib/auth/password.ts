import { isValidWaitlistEmail } from '../public/forms.js';

export function validatePasswordChangeInput(body: {
  currentPassword?: unknown;
  newPassword?: unknown;
}): { ok: true } | { ok: false; error: string } {
  if (!body.currentPassword || typeof body.currentPassword !== 'string') {
    return { ok: false, error: 'Current password and new password are required.' };
  }
  if (!body.newPassword || typeof body.newPassword !== 'string') {
    return { ok: false, error: 'Current password and new password are required.' };
  }
  return { ok: true };
}

export function validateResetPasswordEmail(
  email: unknown,
): { ok: true; email: string } | { ok: false; error: string } {
  const raw = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidWaitlistEmail(raw)) {
    return { ok: false, error: 'A valid email address is required.' };
  }
  return { ok: true, email: raw };
}

export const RESET_PASSWORD_SUCCESS_MESSAGE =
  'If an account exists with this email address, a password reset link has been sent.';

export const MAGIC_LINK_SUCCESS_MESSAGE =
  'A sign-in link has been sent to your email address.';
