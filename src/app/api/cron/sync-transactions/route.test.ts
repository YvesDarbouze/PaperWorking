/** @jest-environment node */
import { NextRequest } from 'next/server';

// Mock token vault
jest.mock('@/lib/encryption/tokenVault', () => ({
  decryptToken: (token: string) => token,
  decrypt: (token: string) => token,
}));

// Mock Firebase Admin
const mockGetDoc = jest.fn().mockResolvedValue({
  exists: true,
  data: () => ({ organizationId: 'org_abc' }),
});
const mockGetProjects = jest.fn().mockResolvedValue({
  docs: [
    {
      id: 'proj_rent',
      data: () => ({
        id: 'proj_rent',
        address: '123 Main St',
        financials: { monthlyGrossRent: 250000 },
        acquisitionDate: new Date('2025-06-01'),
        dispositionType: 'RENT',
        phase: 'hold',
      }),
    },
  ],
});
const mockGetSubcollection = jest.fn().mockResolvedValue({
  docs: [],
});

const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(true);
const mockBatch = jest.fn().mockReturnValue({
  set: mockBatchSet,
  commit: mockBatchCommit,
});

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (col: string) => {
      if (col === 'users') {
        return {
          doc: (id: string) => ({
            get: mockGetDoc,
          }),
        };
      }
      if (col === 'projects') {
        return {
          where: () => ({
            get: mockGetProjects,
          }),
          doc: (id: string) => ({
            collection: (subcol: string) => ({
              get: mockGetSubcollection,
            }),
          }),
        };
      }
      const mockQuery: any = {
        where: () => mockQuery,
        get: jest.fn().mockResolvedValue({ empty: true }),
        doc: (id: string) => ({
          set: jest.fn(),
        }),
      };
      return mockQuery;
    },
    batch: () => mockBatch(),
  },
}));

import { GET } from './route';

// Mock prisma client
const mockFindMany = jest.fn();
const mockUpsertConnection = jest.fn();
const mockUpdateConnection = jest.fn();
const mockUpsertAccount = jest.fn();
const mockUpsertTransaction = jest.fn();
const mockDeleteManyTransactions = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    bankConnection: {
      findMany: (...args: any[]) => mockFindMany(...args),
      upsert: (...args: any[]) => mockUpsertConnection(...args),
      update: (...args: any[]) => mockUpdateConnection(...args),
    },
    bankAccount: {
      upsert: (...args: any[]) => mockUpsertAccount(...args),
    },
    transaction: {
      upsert: (...args: any[]) => mockUpsertTransaction(...args),
      deleteMany: (...args: any[]) => mockDeleteManyTransactions(...args),
    },
  },
  __esModule: true,
  default: {
    bankConnection: {
      findMany: (...args: any[]) => mockFindMany(...args),
      upsert: (...args: any[]) => mockUpsertConnection(...args),
      update: (...args: any[]) => mockUpdateConnection(...args),
    },
    bankAccount: {
      upsert: (...args: any[]) => mockUpsertAccount(...args),
    },
    transaction: {
      upsert: (...args: any[]) => mockUpsertTransaction(...args),
      deleteMany: (...args: any[]) => mockDeleteManyTransactions(...args),
    },
  },
}));

// Mock getBankingProvider
const mockGetTransactions = jest.fn();
jest.mock('@/lib/banking', () => ({
  getBankingProvider: () => ({
    getTransactions: (...args: any[]) => mockGetTransactions(...args),
  }),
}));

describe('Transaction Sync Cron Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'super-secret' };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns 401 when unauthorized (no header / bad secret)', async () => {
    const request = new NextRequest('http://localhost/api/cron/sync-transactions', {
      method: 'GET',
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('runs sync successfully when authorized', async () => {
    const request = new NextRequest('http://localhost/api/cron/sync-transactions', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer super-secret',
      },
    });

    // Mock active connections
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'conn_1',
        userId: 'user_abc',
        accessToken: 'enc_token_123',
        lastSyncCursor: 'cursor_123',
        status: 'active',
      },
    ]);

    // Mock provider transactions response
    mockGetTransactions.mockResolvedValueOnce({
      added: [
        {
          plaidId: 'tx_99',
          accountId: 'acc_123',
          amount: 2500,
          date: new Date(),
          name: 'RENT PAYMENT - TENANT LLC',
          category: ['Income'],
          merchantName: 'TENANT LLC',
          pending: false,
        },
      ],
      modified: [],
      removed: [],
      nextCursor: 'cursor_456',
      hasMore: false,
    });

    mockUpsertTransaction.mockResolvedValue({ id: 'tx_99' });
    mockUpdateConnection.mockResolvedValue({ id: 'conn_1' });
    const response = await GET(request);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.synced).toBe(1);
    expect(json.failures).toBe(0);

    expect(mockGetTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'enc_token_123',
        cursor: 'cursor_123',
      })
    );
    expect(mockUpsertTransaction).toHaveBeenCalled();
    expect(mockUpdateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conn_1' },
        data: expect.objectContaining({
          lastSyncCursor: 'cursor_456',
        }),
      })
    );
  });
});
