import { describe, expect, it } from '@jest/globals';
import { verifyBroadcastToken } from '../lib/deals/broadcast-token.js';

function encodePayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from(`${header}.${body}.paperworking_secret`).toString('base64url');
  return `${header}.${body}.${signature}`;
}

describe('verifyBroadcastToken', () => {
  it('accepts valid token signed with default dev secret', () => {
    const token = encodePayload({
      dealId: 'deal-abc',
      email: 'investor@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const payload = verifyBroadcastToken(token);
    expect(payload?.dealId).toBe('deal-abc');
    expect(payload?.email).toBe('investor@example.com');
  });

  it('rejects expired token', () => {
    const token = encodePayload({
      dealId: 'deal-abc',
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(verifyBroadcastToken(token)).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = encodePayload({ dealId: 'deal-abc' });
    expect(verifyBroadcastToken(`${token}x`)).toBeNull();
  });
});
