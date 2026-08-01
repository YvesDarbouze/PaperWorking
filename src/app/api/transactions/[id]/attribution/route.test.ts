/** @jest-environment node */
import { PATCH, POST } from './route';
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
const mockGetProject = jest.fn().mockResolvedValue({
  exists: true,
  data: () => ({
    id: 'proj_abc',
    organizationId: 'org_abc',
    financials: {
      costs: [],
      actualRentalIncome: 0,
    },
  }),
});
const mockUpdateProject = jest.fn().mockResolvedValue(true);
const mockGetInboxItems = jest.fn().mockResolvedValue({
  docs: [
    {
      ref: {
        update: jest.fn().mockResolvedValue(true),
      },
    },
  ],
});

const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(true);
const mockBatch = jest.fn().mockReturnValue({
  update: mockBatchUpdate,
  commit: mockBatchCommit,
});

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user_abc' }),
  },
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
          doc: (id: string) => ({
            get: mockGetProject,
            update: mockUpdateProject,
          }),
        };
      }
      const mockQuery: any = {
        where: () => mockQuery,
        get: mockGetInboxItems,
      };
      return mockQuery;
    },
    batch: () => mockBatch(),
  },
}));

// Mock prisma client
const mockFindUnique = jest.fn();
const mockUpdateTransaction = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdateTransaction(...args),
      findMany: jest.fn().mockResolvedValue([]),
    },
    dealFinancials: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
  __esModule: true,
  default: {
    transaction: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdateTransaction(...args),
      findMany: jest.fn().mockResolvedValue([]),
    },
    dealFinancials: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock cache invalidator
jest.mock('@/lib/cache/dashboardCache', () => ({
  clearDashboardCache: jest.fn(),
}));

describe('Manual Attribution API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PATCH returns 401 when unauthorized', async () => {
    const request = new NextRequest('http://localhost/api/transactions/tx_123/attribution', {
      method: 'PATCH',
      body: JSON.stringify({ projectId: 'proj_abc' }),
    });

    const response = await PATCH(request, { params: { id: 'tx_123' } });
    expect(response.status).toBe(401);
  });

  it('PATCH updates transaction and dismisses inbox item on success', async () => {
    const request = new NextRequest('http://localhost/api/transactions/tx_123/attribution', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ projectId: 'proj_abc' }),
    });

    mockFindUnique.mockResolvedValueOnce({
      plaidId: 'tx_123',
      userId: 'user_abc',
      projectId: null,
    });

    mockUpdateTransaction.mockResolvedValueOnce({
      plaidId: 'tx_123',
      projectId: 'proj_abc',
      reviewedByUser: true,
    });

    const response = await PATCH(request, { params: { id: 'tx_123' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUpdateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tx_123' },
        data: expect.objectContaining({
          projectId: 'proj_abc',
          reviewedByUser: true,
        }),
      })
    );
  });
});
