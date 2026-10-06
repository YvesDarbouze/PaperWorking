/**
 * Derives a secure password hash using scrypt key derivation.
 * Output format: `<salt_hex>:<derived_key_hex>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash in constant time.
 */
export function verifyPasswordHash(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
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
