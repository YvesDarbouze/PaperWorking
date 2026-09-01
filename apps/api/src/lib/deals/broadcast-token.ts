/**
 * Verify deal broadcast/invite tokens for unauthenticated external replies.
 * Must match FE signing in apps/web/lib/deals/token.ts (use env secret in production).
 */

export type BroadcastTokenPayload = {
  dealId?: string;
  email?: string;
  exp?: number;
};

function base64UrlDecode(segment: string): string {
  let base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function verifyBroadcastToken(token: string): BroadcastTokenPayload | null {
  if (!token?.trim()) return null;
  const parts = token.trim().split('.');
  if (parts.length < 3) return null;

  const secret =
    process.env.BROADCAST_TOKEN_SECRET?.trim() ||
    process.env.DEAL_REPLY_WEBHOOK_SECRET?.trim() ||
    'paperworking_secret';

  const expectedSig = Buffer.from(`${parts[0]}.${parts[1]}.${secret}`).toString('base64url');
  if (parts[2] !== expectedSig) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as BroadcastTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
