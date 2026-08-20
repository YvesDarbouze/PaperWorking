import { describe, expect, it, jest } from '@jest/globals';
import { handleAdminLenderRatesGet } from '../routes/admin/lender-rates/handler.js';
import { DEFAULT_RATES } from '../lib/providers/lender-rates.js';
import type { AdminAuthContext } from '../lib/auth/admin-types.js';

const adminAuth: AdminAuthContext = { uid: 'admin-1', role: 'admin', isAdmin: true };

describe('GET /api/admin/lender-rates', () => {
  it('returns 401 when requireAdmin is missing', async () => {
    const result = await handleAdminLenderRatesGet();
    expect(result.status).toBe(401);
  });

  it('returns auth failure from requireAdmin', async () => {
    const result = await handleAdminLenderRatesGet({
      requireAdmin: async () => ({ status: 403, body: { error: 'Forbidden' } }),
    });
    expect(result.status).toBe(403);
  });

  it('returns default rates when config doc is absent', async () => {
    const result = await handleAdminLenderRatesGet({
      requireAdmin: async () => adminAuth,
    });

    expect(result.status).toBe(200);
    const body = result.body as {
      rates: Array<{ id: string; asOf: null }>;
      updatedAt: null;
      updatedByEmail: null;
    };
    expect(body.rates).toHaveLength(DEFAULT_RATES.length);
    expect(body.rates[0]?.id).toBe('NEO');
    expect(body.rates[0]?.asOf).toBeNull();
    expect(body.updatedAt).toBeNull();
    expect(body.updatedByEmail).toBeNull();
  });

  it('returns parsed Firestore config document', async () => {
    const result = await handleAdminLenderRatesGet({
      requireAdmin: async () => adminAuth,
      getConfigDoc: async () => ({
        rates: [
          {
            id: 'CUSTOM',
            name: 'Custom Lender',
            interestRate: 7.0,
            points: 2,
            lenderFeesCents: 200000,
            asOf: { toDate: () => new Date('2026-03-01T00:00:00.000Z') },
          },
        ],
        updatedAt: { toDate: () => new Date('2026-03-15T12:00:00.000Z') },
        updatedByEmail: 'admin@example.com',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      rates: [
        {
          id: 'CUSTOM',
          name: 'Custom Lender',
          interestRate: 7,
          points: 2,
          lenderFeesCents: 200000,
          asOf: '2026-03-01T00:00:00.000Z',
        },
      ],
      updatedAt: '2026-03-15T12:00:00.000Z',
      updatedByEmail: 'admin@example.com',
    });
  });
});

describe('GET /api/admin/lender-checklists', () => {
  it('returns default checklists when config doc is absent', async () => {
    const { handleAdminLenderChecklistsGet } = await import(
      '../routes/admin/lender-checklists/handler.js'
    );
    const { DEFAULT_CHECKLIST_DEFINITIONS } = await import(
      '../lib/providers/lender-checklists.js'
    );

    const result = await handleAdminLenderChecklistsGet({
      requireAdmin: async () => adminAuth,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      checklists: DEFAULT_CHECKLIST_DEFINITIONS,
      updatedAt: null,
      updatedByEmail: null,
    });
  });

  it('returns parsed checklists from Firestore doc', async () => {
    const { handleAdminLenderChecklistsGet } = await import(
      '../routes/admin/lender-checklists/handler.js'
    );

    const result = await handleAdminLenderChecklistsGet({
      requireAdmin: async () => adminAuth,
      getConfigDoc: async () => ({
        Conventional: ['Tax Returns'],
        'SBA 504': ['SBA Form'],
        'Hard Money': ['Contract'],
        Bridge: ['Bridge Doc'],
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedByEmail: 'ops@example.com',
      }),
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      checklists: {
        Conventional: ['Tax Returns'],
        'SBA 504': ['SBA Form'],
        'Hard Money': ['Contract'],
        Bridge: ['Bridge Doc'],
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedByEmail: 'ops@example.com',
    });
  });
});

describe('GET /api/admin/rentcast-usage', () => {
  it('returns usage stats for current month by default', async () => {
    const { handleAdminRentcastUsageGet } = await import(
      '../routes/admin/rentcast-usage/handler.js'
    );

    const result = await handleAdminRentcastUsageGet(
      {},
      {
        requireAdmin: async () => adminAuth,
        countCalls: jest.fn().mockResolvedValue(42),
        now: () => new Date('2026-08-15T00:00:00.000Z'),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      year: 2026,
      month: 8,
      count: 42,
      limit: 500,
    });
  });

  it('honors year/month query overrides', async () => {
    const { handleAdminRentcastUsageGet } = await import(
      '../routes/admin/rentcast-usage/handler.js'
    );
    const countCalls = jest.fn().mockResolvedValue(10);

    const result = await handleAdminRentcastUsageGet(
      { year: 2025, month: 12 },
      {
        requireAdmin: async () => adminAuth,
        countCalls,
      },
    );

    expect(countCalls).toHaveBeenCalledWith(2025, 12);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ year: 2025, month: 12, count: 10 });
  });
});

describe('GET /api/admin/agent-crew', () => {
  it('returns synthetic agents from injected loader', async () => {
    const { handleAdminAgentCrewGet } = await import(
      '../routes/admin/agent-crew/handler.js'
    );

    const agents = [
      {
        id: 'agent-1',
        uid: 'uid-1',
        name: 'Scout',
        email: 'scout@example.com',
        persona: 'scout',
        handle: '@scout',
        stats: { projectsCount: 3, listingsCount: 1, messagesCount: 5 },
      },
    ];

    const result = await handleAdminAgentCrewGet({
      requireAdmin: async () => adminAuth,
      listAgents: async () => agents,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, count: 1, agents });
  });

  it('returns empty list when loader is not configured', async () => {
    const { handleAdminAgentCrewGet } = await import(
      '../routes/admin/agent-crew/handler.js'
    );

    const result = await handleAdminAgentCrewGet({
      requireAdmin: async () => adminAuth,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, count: 0, agents: [] });
  });
});
