import { NextRequest } from 'next/server';

// ── Mock verifyIdToken, requireAuth, & DB ──
const mockVerifyIdToken = jest.fn();
const mockUserDocGet = jest.fn();
const mockProjectCollectionGet = jest.fn();

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(async () => {
    return {
      uid: 'test-user-id',
      token: {
        uid: 'test-user-id',
        email: 'investor@paperworking.com',
      },
    };
  }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (colName: string) => {
      if (colName === 'users') {
        return {
          doc: (docId: string) => ({
            get: async () => {
              const res = await mockUserDocGet(docId);
              return {
                exists: !!res,
                data: () => res,
                id: docId,
              };
            },
          }),
        };
      }
      // projects collection
      return {
        where: (field: string, op: string, val: string) => ({
          get: async () => {
            const docs = await mockProjectCollectionGet(val);
            return {
              empty: docs.length === 0,
              docs: docs.map((d: any) => ({
                id: d.id,
                data: () => d,
              })),
            };
          },
        }),
      };
    },
  },
}));

// Mock Prisma
const mockTransactionFindMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    transaction: {
      findMany: (...args: any[]) => mockTransactionFindMany(...args),
    },
  },
}));

// Import target API route handler
import { POST } from '@/app/api/reports/generate/route';

describe('Reports PDF & CSV Generation API Tests', () => {
  const mockProjects = [
    {
      id: 'proj_1',
      propertyName: 'Austin Condo',
      address: '100 Congress Ave, Austin, TX 78701',
      organizationId: 'org_test_123',
      phase: 'hold',
      status: 'hold',
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM',
      financials: {
        purchasePrice: 300000,
        estimatedARV: 350000,
      },
    },
  ];

  const mockTransactions = [
    {
      id: 'tx_1',
      plaidId: 'p_1',
      connectionId: 'c_1',
      accountId: 'a_1',
      userId: 'test-user-id',
      amount: BigInt(150000), // $1500 (cents)
      date: new Date('2026-07-01'),
      category: ['Income'],
      merchantName: 'Tenant Rent Payment',
      reiCategory: 'rental_income',
      projectId: 'proj_1',
    },
    {
      id: 'tx_2',
      plaidId: 'p_2',
      connectionId: 'c_1',
      accountId: 'a_1',
      userId: 'test-user-id',
      amount: BigInt(30000), // $300 (cents)
      date: new Date('2026-07-05'),
      category: ['Expense'],
      merchantName: 'Plumbing Service',
      reiCategory: 'maintenance',
      projectId: 'proj_1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserDocGet.mockResolvedValue({
      uid: 'test-user-id',
      displayName: 'Marcus Aurelius',
      subscriptionStatus: 'active',
      subscriptionPlan: 'Individual',
      organizationId: 'org_test_123',
    });

    mockProjectCollectionGet.mockResolvedValue(mockProjects);
    mockTransactionFindMany.mockResolvedValue(mockTransactions);
  });

  it('generates PDF report successfully for portfolio scope for premium user', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'portfolio',
        format: 'pdf',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('paperworking_portfolio_');
    expect(res.headers.get('Content-Disposition')).toContain('.pdf');

    // Read response body as arrayBuffer to check length
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('generates PDF report successfully for project scope for premium user', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'project',
        projectId: 'proj_1',
        format: 'pdf',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('paperworking_project_');

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('generates CSV report for portfolio KPIs', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'portfolio',
        format: 'csv',
        type: 'portfolio',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('paperworking_portfolio_');

    const text = await res.text();
    expect(text).toContain('Project Address,Phase,');
    expect(text).toContain('Austin Condo');
  });

  it('generates CSV report for transactions ledger', async () => {
    const req = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'portfolio',
        format: 'csv',
        type: 'transactions',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('paperworking_transactions_');

    const text = await res.text();
    expect(text).toContain('Date,Merchant Name,Category,REI Category,Amount,Project,Reviewed');
    expect(text).toContain('Tenant Rent Payment');
  });

  it('respects paywall and strips/obfuscates sensitive data for non-premium users', async () => {
    // Non-premium subscriber
    mockUserDocGet.mockResolvedValue({
      uid: 'test-user-id',
      displayName: 'Marcus Aurelius',
      subscriptionStatus: 'inactive',
      subscriptionPlan: 'None',
      organizationId: 'org_test_123',
    });

    // Test CSV Portfolio paywall
    const reqCsv = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'portfolio',
        format: 'csv',
        type: 'portfolio',
      }),
    });

    const resCsv = await POST(reqCsv);
    const textCsv = await resCsv.text();
    // Sensitive metrics should be obfuscated with [Locked]
    expect(textCsv).toContain('[Locked]');

    // Test CSV Transactions paywall
    const reqTx = new NextRequest('http://localhost:3000/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        scope: 'portfolio',
        format: 'csv',
        type: 'transactions',
      }),
    });

    const resTx = await POST(reqTx);
    const textTx = await resTx.text();
    expect(textTx).toContain('[Locked]');
    expect(textTx).toContain('Confidential Merchant');
  });
});
