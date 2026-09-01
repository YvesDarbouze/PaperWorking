import { describe, expect, it } from '@jest/globals';
import {
  buildAuthSessionsResponse,
  handleAuthSessionsGet,
} from '../routes/auth/sessions/handler.js';

const investorUser = {
  uid: '11111111-1111-4111-8111-111111111111',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
  role: 'investor',
};

const fixedNow = new Date('2026-03-15T12:00:00.000Z');

describe('GET /api/auth/sessions handler', () => {
  it('returns 401 when user is missing', async () => {
    const result = await handleAuthSessionsGet(null);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns Nest-compatible stub session list', async () => {
    const result = await handleAuthSessionsGet(investorUser, 'Mozilla/5.0 Test', {
      now: () => fixedNow,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      incomplete: true,
      stub: true,
      message: 'Multi-device session listing is not implemented; showing current session only.',
      sessions: [
        {
          id: 'sess_current',
          uid: investorUser.uid,
          createdAt: fixedNow.toISOString(),
          lastActiveAt: fixedNow.toISOString(),
          userAgent: 'Mozilla/5.0 Test',
          current: true,
        },
      ],
    });
  });

  it('uses uid from AuthUser, not client-supplied values', () => {
    const body = buildAuthSessionsResponse(
      {
        uid: 'db-authoritative-uid',
        accountType: 'investor',
        isAdmin: false,
      },
      'curl/8.0',
      { now: () => fixedNow },
    );

    expect(body.sessions[0]?.uid).toBe('db-authoritative-uid');
    expect(body.sessions[0]?.userAgent).toBe('curl/8.0');
  });

  it('defaults userAgent to unknown when omitted', () => {
    const body = buildAuthSessionsResponse(investorUser, undefined, {
      now: () => fixedNow,
    });
    expect(body.sessions[0]?.userAgent).toBe('unknown');
  });
});

describe('parity: Nest listSessions and shared handler', () => {
  it('AuthService.listSessions delegates to buildAuthSessionsResponse', async () => {
    const { AuthService } = await import('../auth/auth.service.js');
    const prisma = {
      user: { findFirst: async () => null, upsert: async () => ({}) },
      subscription: { findFirst: async () => null },
    };
    const auth = new AuthService(prisma as never);
    const nest = await auth.listSessions(investorUser, 'TestAgent/1.0');

    expect(nest).toMatchObject({
      success: true,
      incomplete: true,
      stub: true,
      message: 'Multi-device session listing is not implemented; showing current session only.',
      sessions: [
        {
          id: 'sess_current',
          uid: investorUser.uid,
          userAgent: 'TestAgent/1.0',
          current: true,
        },
      ],
    });
    expect(nest.sessions[0]?.createdAt).toBe(nest.sessions[0]?.lastActiveAt);
  });
});
