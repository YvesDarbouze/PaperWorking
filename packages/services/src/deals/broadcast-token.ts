import { DealCommunicationValidationError } from './deal-communication-errors.js';

/**
 * Signed broadcast/reply token payload (stateless HMAC — not stored in Postgres).
 */
export type BroadcastTokenPayload = {
  dealId: string;
  email?: string;
  exp?: number;
  invitationId?: string;
  broadcastId?: string;
  broadcast?: boolean;
  type?: 'broadcast';
};

/** Default 14-day recipient link validity unless overridden. */
export const DEFAULT_BROADCAST_TOKEN_TTL_SEC =
  Number(process.env.BROADCAST_TOKEN_TTL_SEC || 14 * 24 * 60 * 60) || 14 * 24 * 60 * 60;

const DEV_BROADCAST_TOKEN_FALLBACK = 'paperworking_secret_dev_only';

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isExplicitTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test';
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(segment: string): string {
  let base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Broadcast reply token secret — separate from webhook inbound secret.
 * Production fails closed when unset.
 */
export function requireBroadcastTokenSecret(): string {
  const configured = process.env.BROADCAST_TOKEN_SECRET?.trim();
  if (configured) return configured;
  if (isProductionRuntime()) {
    throw new DealCommunicationValidationError(
      'BROADCAST_TOKEN_SECRET is required in production',
    );
  }
  if (isExplicitTestRuntime()) {
    return DEV_BROADCAST_TOKEN_FALLBACK;
  }
  return DEV_BROADCAST_TOKEN_FALLBACK;
}

/** @deprecated Prefer requireBroadcastTokenSecret — kept for audit visibility. */
export function resolveBroadcastTokenSecret(): string {
  return requireBroadcastTokenSecret();
}

/**
 * Inbound email/webhook secret — separate trust domain from broadcast tokens.
 */
export function resolveDealReplyWebhookSecret(): string | null {
  const configured = process.env.DEAL_REPLY_WEBHOOK_SECRET?.trim();
  if (configured) return configured;
  if (isProductionRuntime()) {
    return null;
  }
  if (isExplicitTestRuntime()) {
    return 'deal_reply_webhook_test_secret';
  }
  return null;
}

export function signBroadcastToken(
  payload: BroadcastTokenPayload,
  options: { ttlSec?: number; nowSec?: number } = {},
): string {
  const secret = requireBroadcastTokenSecret();
  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const ttlSec = options.ttlSec ?? DEFAULT_BROADCAST_TOKEN_TTL_SEC;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: payload.exp ?? nowSec + ttlSec,
    }),
  );
  const signature = Buffer.from(`${header}.${body}.${secret}`).toString('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyBroadcastToken(token: string): BroadcastTokenPayload | null {
  if (!token?.trim()) return null;
  const parts = token.trim().split('.');
  if (parts.length < 3) return null;

  let secret: string;
  try {
    secret = requireBroadcastTokenSecret();
  } catch {
    return null;
  }

  const expectedSig = Buffer.from(`${parts[0]}.${parts[1]}.${secret}`).toString('base64url');
  if (parts[2] !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as BroadcastTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.dealId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function resolveDealAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function buildDealExternalReplyUrl(input: {
  appBaseUrl: string;
  dealSlug: string;
  token: string;
}): string {
  const base = input.appBaseUrl.replace(/\/+$/, '');
  const slug = encodeURIComponent(input.dealSlug);
  const token = encodeURIComponent(input.token);
  return `${base}/deals/${slug}/external?token=${token}&broadcast=true`;
}
