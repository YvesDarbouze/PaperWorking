import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  buildDealExternalReplyUrl,
  requireBroadcastTokenSecret,
  resolveDealReplyWebhookSecret,
  signBroadcastToken,
  verifyBroadcastToken,
} from '../deals/broadcast-token.js';
import { DealCommunicationValidationError } from '../deals/deal-communication-errors.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('broadcast token secret configuration', () => {
  it('requires BROADCAST_TOKEN_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.BROADCAST_TOKEN_SECRET;

    expect(() => requireBroadcastTokenSecret()).toThrow(DealCommunicationValidationError);
    expect(() => requireBroadcastTokenSecret()).toThrow(/BROADCAST_TOKEN_SECRET is required/);
  });

  it('uses explicit test fallback only in test runtime', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.BROADCAST_TOKEN_SECRET;

    expect(requireBroadcastTokenSecret()).toBe('paperworking_secret_dev_only');
  });

  it('prefers configured BROADCAST_TOKEN_SECRET', () => {
    process.env.NODE_ENV = 'production';
    process.env.BROADCAST_TOKEN_SECRET = 'prod-broadcast-secret';

    expect(requireBroadcastTokenSecret()).toBe('prod-broadcast-secret');
  });

  it('keeps webhook secret separate from broadcast token secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.BROADCAST_TOKEN_SECRET = 'broadcast-only';
    delete process.env.DEAL_REPLY_WEBHOOK_SECRET;

    expect(requireBroadcastTokenSecret()).toBe('broadcast-only');
    expect(resolveDealReplyWebhookSecret()).toBeNull();
  });

  it('returns test webhook secret only in test runtime', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEAL_REPLY_WEBHOOK_SECRET;

    expect(resolveDealReplyWebhookSecret()).toBe('deal_reply_webhook_test_secret');
  });
});

describe('broadcast token signing and verification', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.BROADCAST_TOKEN_SECRET = 'unit-test-secret';
  });

  it('accepts valid token and binds deal/recipient/expiry', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const token = signBroadcastToken(
      {
        dealId: 'deal-abc',
        email: 'investor@example.com',
        invitationId: 'inv-1',
        broadcastId: 'bc-1',
      },
      { nowSec, ttlSec: 3600 },
    );

    const payload = verifyBroadcastToken(token);
    expect(payload?.dealId).toBe('deal-abc');
    expect(payload?.email).toBe('investor@example.com');
    expect(payload?.invitationId).toBe('inv-1');
    expect(payload?.broadcastId).toBe('bc-1');
    expect(payload?.exp).toBe(nowSec + 3600);
  });

  it('rejects expired token', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const token = signBroadcastToken(
      { dealId: 'deal-abc', email: 'investor@example.com' },
      { nowSec: nowSec - 7200, ttlSec: 3600 },
    );

    expect(verifyBroadcastToken(token)).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = signBroadcastToken({ dealId: 'deal-abc' });
    expect(verifyBroadcastToken(`${token}x`)).toBeNull();
  });

  it('rejects token signed with a different secret', () => {
    process.env.BROADCAST_TOKEN_SECRET = 'secret-a';
    const token = signBroadcastToken({ dealId: 'deal-abc' });

    process.env.BROADCAST_TOKEN_SECRET = 'secret-b';
    expect(verifyBroadcastToken(token)).toBeNull();
  });

  it('builds external reply URLs from app base URL and slug', () => {
    const url = buildDealExternalReplyUrl({
      appBaseUrl: 'https://staging.example.com/',
      dealSlug: 'my-deal',
      token: 'abc.def.ghi',
    });

    expect(url).toBe(
      'https://staging.example.com/deals/my-deal/external?token=abc.def.ghi&broadcast=true',
    );
  });
});
