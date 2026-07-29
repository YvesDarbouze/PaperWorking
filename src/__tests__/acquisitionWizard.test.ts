import { NextRequest } from 'next/server';

// ── Mock verifyIdToken, requireAuth, & DB ──
var mockVerifyIdToken = jest.fn();
var mockUserDocGet = jest.fn();
var mockProjectDocGet = jest.fn();
var mockDocSet = jest.fn();

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
        doc: (projectId: string) => ({
          get: async () => {
            const res = await mockProjectDocGet(projectId);
            return {
              exists: !!res,
              data: () => res,
              id: projectId,
            };
          },
          collection: (subColName: string) => {
            if (subColName === 'documents') {
              return {
                doc: (docId: string) => ({
                  set: async (data: any) => mockDocSet(docId, data),
                }),
              };
            }
            return {};
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

import { POST } from '@/app/api/loi/generate/route';

describe('Acquisition Phase LOI PDF Generation API Tests', () => {
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

  it('successfully generates an LOI PDF and saves it to documents subcollection', async () => {
    const request = new NextRequest('http://localhost:3000/api/loi/generate', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project_123',
        offerAmount: 185000,
        earnestMoney: 2000,
        closingDate: '2026-09-01',
        contingencies: ['Inspection', 'Financing'],
        buyerEntity: 'Atlanta Holdings LLC',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename=');

    // Verify it was added to Firestore documents subcollection
    expect(mockDocSet).toHaveBeenCalled();
    const [savedId, savedData] = mockDocSet.mock.calls[0];
    expect(savedId).toContain('loi_');
    expect(savedData.projectId).toBe('project_123');
    expect(savedData.category).toBe('Purchase Agreement');
    expect(savedData.fileName).toBe('Letter_of_Intent.pdf');
    expect(savedData.notes).toBe('Generated Letter of Intent (LOI)');
  });

  it('rejects request if projectId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/loi/generate', {
      method: 'POST',
      body: JSON.stringify({
        offerAmount: 185000,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('projectId is required');
  });

  it('returns 404 if project does not exist', async () => {
    mockProjectDocGet.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/loi/generate', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'non_existent_project',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Project not found');
  });
});
