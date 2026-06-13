import { GET } from '@/app/api/dashboard/route';
import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Mock variables
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockSetDashboardCache = jest.fn();
const mockGetDashboardCache = jest.fn();

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(() => mockVerifyIdToken()),
  isAuthError: (auth: any) => auth && auth.status && auth.status !== 200,
}));

jest.mock('@/lib/firebase/admin', () => {
  const query: any = {
    where: jest.fn().mockImplementation(function(this: any) { return this; }),
    orderBy: jest.fn().mockImplementation(function(this: any) { return this; }),
    limit: jest.fn().mockImplementation(function(this: any) { return this; }),
    get: jest.fn().mockImplementation(function(this: any) {
      return mockGet(this._colName, this._docId, this._subCol);
    }),
  };

  const doc: any = {
    get: jest.fn().mockImplementation(function(this: any) {
      return mockGet(this._colName, this._docId);
    }),
    collection: jest.fn().mockImplementation(function(this: any, subCol: string) {
      return {
        ...query,
        _colName: this._colName,
        _docId: this._docId,
        _subCol: subCol,
      };
    }),
  };

  return {
    adminDb: {
      collection: jest.fn().mockImplementation((colName) => ({
        ...query,
        _colName: colName,
        doc: jest.fn().mockImplementation((docId) => ({
          ...doc,
          _colName: colName,
          _docId: docId,
        })),
      })),
    },
  };
});

jest.mock('@/lib/cache/dashboardCache', () => ({
  getDashboardCache: (...args: any[]) => mockGetDashboardCache(...args),
  setDashboardCache: (...args: any[]) => mockSetDashboardCache(...args),
}));

describe('Scoped Security Rules & Dashboard Route Integration', () => {
  const rootPath = path.resolve(__dirname, '..', '..');
  const firestoreRules = fs.readFileSync(path.join(rootPath, 'firestore.rules'), 'utf8');
  const storageRules = fs.readFileSync(path.join(rootPath, 'storage.rules'), 'utf8');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Firestore Rules Contract Checks ─────────────────────────────
  describe('Firestore Rules Scope Contract Checks', () => {
    it('defines hasProjectScopeAccess helper function', () => {
      expect(firestoreRules).toContain('function hasProjectScopeAccess');
    });

    it('defines canAccessProject helper function', () => {
      expect(firestoreRules).toContain('function canAccessProject');
    });

    it('replaces project read checks with canAccessProject', () => {
      expect(firestoreRules).toMatch(/match \/projects\/\{projectId\}[\s\S]+?allow read: if request\.auth != null[\s\S]+?canAccessProject/);
    });

    it('replaces ledgerItems checks with canAccessProject', () => {
      expect(firestoreRules).toMatch(/match \/ledgerItems\/\{itemId\}[\s\S]+?allow read: if request\.auth != null[\s\S]+?canAccessProject/);
    });
  });

  // ─── 2. Storage Rules Contract Checks ───────────────────────────────
  describe('Storage Rules Scope Contract Checks', () => {
    it('isProjectMember checks membershipScopes in Firestore', () => {
      expect(storageRules).toContain('membershipScopes');
      expect(storageRules).toContain('isScoped');
      expect(storageRules).toContain('scopedProjectIds');
    });
  });

  // ─── 3. Dashboard API Route Scope Filtering & Caching ──────────────
  describe('Dashboard API Route Scope Integration', () => {
    const orgId = 'org_abc_123';
    const mockRequest = new NextRequest(`http://localhost/api/dashboard?organizationId=${orgId}`, {
      method: 'GET',
    });

    it('filters projects and audit logs, and bypasses cache for scoped users', async () => {
      // 1. Authenticate user
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_scoped_999' });

      // 2. Mock user profile showing scoped status
      mockGet.mockImplementation((colName: string, docId: string, subCol?: string) => {
        if (colName === 'users' && docId === 'user_scoped_999') {
          return {
            exists: true,
            data: () => ({
              uid: 'user_scoped_999',
              organizationId: orgId,
              membershipScopes: {
                [orgId]: {
                  isScoped: true,
                  scopedProjectIds: ['proj_allowed'],
                },
              },
            }),
          };
        }

        if (colName === 'organizations' && docId === orgId) {
          return {
            exists: true,
            data: () => ({
              ownerUid: 'owner_123',
              teamMembers: [{ id: 'user_scoped_999', status: 'active' }],
            }),
          };
        }

        // Return two projects (allowed one, forbidden one)
        if (colName === 'projects' && !docId && !subCol) {
          return {
            docs: [
              {
                id: 'proj_allowed',
                data: () => ({
                  organizationId: orgId,
                  propertyName: 'Allowed Project',
                  status: 'Active',
                  currentPhase: 1,
                  financials: { purchasePrice: 100000, projectedRent: 1500 },
                }),
              },
              {
                id: 'proj_forbidden',
                data: () => ({
                  organizationId: orgId,
                  propertyName: 'Forbidden Project',
                  status: 'Active',
                  currentPhase: 1,
                  financials: { purchasePrice: 200000, projectedRent: 3000 },
                }),
              },
            ],
          };
        }

        // Empty ledgerItems for the calculations
        if (colName === 'projects' && docId === 'proj_allowed' && subCol === 'ledgerItems') {
          return { docs: [] };
        }

        // Snapshots list
        if (colName === 'propertyMetricSnapshots') {
          return { docs: [] };
        }

        // Audit logs (one for allowed project, one for forbidden project)
        if (colName === 'auditLogs') {
          return {
            docs: [
              {
                id: 'log_1',
                data: () => ({
                  actorName: 'System',
                  action: 'PROJECT_CREATED',
                  createdAt: new Date(),
                  metadata: { projectId: 'proj_allowed', projectName: 'Allowed Project' },
                }),
              },
              {
                id: 'log_2',
                data: () => ({
                  actorName: 'System',
                  action: 'PROJECT_CREATED',
                  createdAt: new Date(),
                  metadata: { projectId: 'proj_forbidden', projectName: 'Forbidden Project' },
                }),
              },
            ],
          };
        }

        return { exists: false, docs: [] };
      });

      const res = await GET(mockRequest);
      expect(res.status).toBe(200);

      const payload = await res.json();

      // Verify active projects count is 1 (only the allowed one)
      expect(payload.activeProjects.count).toBe(1);

      // Verify audit logs are filtered to only show allowed project
      expect(payload.recentActivity.length).toBe(1);
      expect(payload.recentActivity[0].message).toContain('Allowed Project');

      // Verify cache was bypassed (no get or set called)
      expect(mockGetDashboardCache).not.toHaveBeenCalled();
      expect(mockSetDashboardCache).not.toHaveBeenCalled();
    });

    it('uses cache and returns all projects for unscoped users', async () => {
      // 1. Authenticate user
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_unscoped_888' });

      // 2. Mock user profile showing unscoped status
      mockGet.mockImplementation((colName: string, docId: string, subCol?: string) => {
        if (colName === 'users' && docId === 'user_unscoped_888') {
          return {
            exists: true,
            data: () => ({
              uid: 'user_unscoped_888',
              organizationId: orgId,
            }),
          };
        }

        if (colName === 'organizations' && docId === orgId) {
          return {
            exists: true,
            data: () => ({
              ownerUid: 'owner_123',
              teamMembers: [{ id: 'user_unscoped_888', status: 'active' }],
            }),
          };
        }

        // Return two projects
        if (colName === 'projects' && !docId && !subCol) {
          return {
            docs: [
              {
                id: 'proj_allowed',
                data: () => ({
                  organizationId: orgId,
                  propertyName: 'Allowed Project',
                  status: 'Active',
                  currentPhase: 1,
                  financials: { purchasePrice: 100000, projectedRent: 1500 },
                }),
              },
              {
                id: 'proj_forbidden',
                data: () => ({
                  organizationId: orgId,
                  propertyName: 'Forbidden Project',
                  status: 'Active',
                  currentPhase: 1,
                  financials: { purchasePrice: 200000, projectedRent: 3000 },
                }),
              },
            ],
          };
        }

        // Empty ledgerItems
        if (colName === 'projects' && (docId === 'proj_allowed' || docId === 'proj_forbidden') && subCol === 'ledgerItems') {
          return { docs: [] };
        }

        if (colName === 'propertyMetricSnapshots') {
          return { docs: [] };
        }

        if (colName === 'auditLogs') {
          return { docs: [] };
        }

        return { exists: false, docs: [] };
      });

      const res = await GET(mockRequest);
      expect(res.status).toBe(200);

      const payload = await res.json();

      // Unscoped user sees both projects
      expect(payload.activeProjects.count).toBe(2);

      // Verify cache was checked and set
      expect(mockGetDashboardCache).toHaveBeenCalledWith(orgId);
      expect(mockSetDashboardCache).toHaveBeenCalledWith(orgId, expect.any(Object));
    });
  });
});
