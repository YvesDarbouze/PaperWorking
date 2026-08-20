import { isInvitationExpired } from './token-ask.js';

export type IndicationType = 'percentage' | 'amount';

export interface IndicationBody {
  type?: unknown;
  value?: unknown;
  currency?: unknown;
}

export function validateIndicationBody(
  body: IndicationBody,
): { ok: true; type: IndicationType; value: number; currency: string | null } | { ok: false; error: string; status: number } {
  const type = body.type;
  if (type !== 'percentage' && type !== 'amount') {
    return { ok: false, error: 'Indication type must be "percentage" or "amount".', status: 400 };
  }

  const value = body.value;
  if (typeof value !== 'number' || value <= 0) {
    return { ok: false, error: 'Indication value must be a positive number.', status: 400 };
  }

  if (type === 'percentage' && value > 100) {
    return { ok: false, error: 'Percentage value cannot exceed 100.', status: 400 };
  }

  if (type === 'amount') {
    const currency = body.currency;
    if (typeof currency !== 'string' || currency.length !== 3) {
      return {
        ok: false,
        error: 'Indication amount requires a valid 3-letter currency code.',
        status: 400,
      };
    }
    return { ok: true, type, value, currency: currency.toUpperCase().trim() };
  }

  return { ok: true, type, value, currency: null };
}

export function buildIndicationUpdate(
  type: IndicationType,
  value: number,
  currency: string | null,
): Record<string, unknown> {
  return {
    indication: {
      type,
      value,
      currency,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function formatIndicationValue(type: IndicationType, value: number, currency: string | null): string {
  if (type === 'amount' && currency) {
    return `${currency} ${Number(value).toLocaleString()}`;
  }
  return `${value}%`;
}

export function checkInvitationNotExpired(expiresAt: string | Date): { ok: true } | { ok: false; error: string; status: number } {
  if (isInvitationExpired(expiresAt)) {
    return { ok: false, error: 'This invitation has expired.', status: 410 };
  }
  return { ok: true };
}
