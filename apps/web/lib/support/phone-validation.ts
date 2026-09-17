/**
 * Phone number validation and normalization utilities for support and callbacks.
 */

/**
 * Normalizes phone numbers to E.164 format (+[country code][number]).
 * Formats: 10-digit US -> +1XXXXXXXXXX, 11-digit with leading 1 -> +1XXXXXXXXXX, +E.164 passed through.
 */
export function normalizeToE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[\s().-]/g, '');

  if (cleaned.startsWith('+')) {
    const digitsAfterPlus = cleaned.substring(1);
    if (/^[1-9]\d{6,14}$/.test(digitsAfterPlus)) {
      return cleaned;
    }
    return null;
  }

  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`;
  }

  if (/^1\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^[1-9]\d{6,14}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
