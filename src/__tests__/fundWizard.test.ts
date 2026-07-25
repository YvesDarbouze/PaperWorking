import { NextRequest } from 'next/server';

// ── Mock verifyIdToken, requireAuth, & DB ──
var mockVerifyIdToken = jest.fn();
var mockUserDocGet = jest.fn();
var mockProjectDocGet = jest.fn();
var mockDocSet = jest.fn();
var mockProjectUpdate = jest.fn();

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

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue('mock-notification-id'),
  }
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
        doc: (projectId: string) => ({
          get: async () => {
            const res = await mockProjectDocGet(projectId);
            return {
              exists: !!res,
              data: () => res,
              id: projectId,
            };
          },
          update: async (data: any) => mockProjectUpdate(data),
          collection: (subColName: string) => {
            if (subColName === 'documents' || subColName === 'reminders') {
              return {
                doc: (docId: string) => ({
                  set: async (data: any) => mockDocSet(docId, data),
                }),
              };
            }
            return {
              doc: () => ({
                set: async () => {},
              }),
            };
          },
        }),
      };
    },
  },
}));

// Mock config to avoid loading real Firebase SDK
jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reilProject: {
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock Telemetry
jest.mock('@/actions/telemetry', () => ({
  trackEvent: jest.fn().mockResolvedValue({}),
}));

import { POST } from '@/app/api/fund/close-deal/route';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

describe('Fund Phase Closing & Metrics Tests', () => {
  const mockProject = {
    id: 'project_123',
    propertyName: 'Atlanta Duplex',
    addressLine: '123 Main St, Atlanta, GA 30309',
    organizationId: 'org_test_123',
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM',
    financials: {
      purchasePrice: 20000000, // in cents ($200K)
      estimatedARV: 25000000,
      capitalStack: [
        {
          id: 's1',
          category: 'Conventional Financing',
          type: 'conventional_loan',
          amount: 150000,
          interestRate: 6.0,
          termMonths: 360,
          status: 'Approved',
        },
        {
          id: 's2',
          category: 'Conventional Financing',
          type: 'conventional_loan',
          amount: 50000,
          interestRate: 8.0,
          termMonths: 360,
          status: 'Approved',
        }
      ],
    },
  };

  const mockUser = {
    uid: 'test-user-id',
    displayName: 'Atlanta Holdings LLC',
    email: 'investor@paperworking.com',
    organizationId: 'org_test_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserDocGet.mockResolvedValue(mockUser);
    mockProjectDocGet.mockResolvedValue(mockProject);
  });

  it('calculates blended interest rate correctly from the capital stack in metrics engine', () => {
    const metrics = deriveAllMetrics(mockProject.financials as any);
    
    // Blended rate expected: ((150k * 6.0) + (50k * 8.0)) / 200k = (900000 + 400000) / 200k = 6.5%
    expect(metrics.loanInterestRate).toBeCloseTo(6.5, 2);
    // Loan amount expected in cents: 200k * 100 = 20000000
    expect(metrics.loanAmount).toBe(20000000);
  });

  it('successfully transitions project status, ledger, and updates properties on Close Deal API', async () => {
    const req = new NextRequest('http://localhost:3000/api/fund/close-deal', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project_123',
        finalPurchasePrice: 200000,
        titleFees: 1500,
        originationFees: 2500,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify Firestore project update payload
    expect(mockProjectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPhase: 3,
        status: 'hold',
        phaseStatus: 'Phase 3: Hold',
        'financials.purchasePrice': 20000000,
        'financials.initialCapitalizedBasis': 20400000, // (200000 + 1500 + 2500) * 100
      })
    );

    // Verify closing summary document is recorded
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fileName: 'Closing_Record_Summary.pdf',
        category: 'Dossier Snapshot',
      })
    );
  });

  it('rejects POST if sources and uses sums do not match and justification is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/fund/close-deal', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project_123',
        finalPurchasePrice: 200000,
        sources: [
          { source: 'Bank Loan', amount: 150000 },
          { source: 'Equity Partner', amount: 45000 }
        ],
        uses: [
          { use: 'Purchase Price', amount: 200000 }
        ]
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Variance');
  });

  it('accepts POST with sources/uses mismatch if justification is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/fund/close-deal', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project_123',
        finalPurchasePrice: 200000,
        sources: [
          { source: 'Bank Loan', amount: 150000 },
          { source: 'Equity Partner', amount: 45000 }
        ],
        uses: [
          { use: 'Purchase Price', amount: 200000 }
        ],
        justification: 'Minor rounding variance'
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('handles isEstimate correctly by writing paid: false and setting up reminder/notification', async () => {
    const req = new NextRequest('http://localhost:3000/api/fund/close-deal', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project_123',
        finalPurchasePrice: 200000,
        isEstimate: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify Firestore project update contains closingFiguresEstimated: true
    expect(mockProjectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'financials.closingFiguresEstimated': true,
        'closingRoom.isEstimate': true,
      })
    );
  });
});
