import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  signBroadcastToken,
  verifyBroadcastToken,
} from '../lib/deals/broadcast-token.js';

describe('verifyBroadcastToken (api re-export)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.BROADCAST_TOKEN_SECRET = 'api-test-secret';
  });

  it('accepts valid token signed with configured secret', () => {
    const token = signBroadcastToken({
      dealId: 'deal-abc',
      email: 'investor@example.com',
    });
    const payload = verifyBroadcastToken(token);
    expect(payload?.dealId).toBe('deal-abc');
    expect(payload?.email).toBe('investor@example.com');
  });

  it('rejects expired token', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const token = signBroadcastToken(
      { dealId: 'deal-abc' },
      { nowSec: nowSec - 7200, ttlSec: 3600 },
    );
    expect(verifyBroadcastToken(token)).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = signBroadcastToken({ dealId: 'deal-abc' });
    expect(verifyBroadcastToken(`${token}x`)).toBeNull();
  });
});
