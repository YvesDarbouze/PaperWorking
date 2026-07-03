/** @jest-environment node */
import { useProjectStore } from '@/store/projectStore';
import { PATCH } from '../app/api/projects/[id]/route';
import { NextRequest } from 'next/server';

// ─── Setup Client-Side Mocks ──────────────────────────────────────
const mockGetIdToken = jest.fn();
jest.mock('@/lib/firebase/config', () => ({
  auth: {
    currentUser: {
      getIdToken: () => mockGetIdToken(),
    },
  },
}));

var mockToastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: any[]) => mockToastError(...args),
  },
}));

// ─── Setup Server-Side Mocks ──────────────────────────────────────
var mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(() => mockVerifyIdToken()),
  isAuthError: (auth: any) => auth && auth.status && auth.status !== 200,
}));

var mockTransactionGet = jest.fn();
var mockTransactionUpdate = jest.fn();
var mockGetDoc = jest.fn();

var mockRunTransaction = jest.fn(async (cb) => {
  return cb({
    get: mockTransactionGet,
    update: mockTransactionUpdate,
  });
});

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation((id) => ({
        get: () => mockGetDoc(id),
      })),
    })),
    runTransaction: (cb: any) => mockRunTransaction(cb),
  },
}));

var mockSyncProjectFinancials = jest.fn();
jest.mock('@/lib/services/financialsSyncService', () => ({
  financialsSyncService: {
    syncProjectFinancials: (deal: any) => mockSyncProjectFinancials(deal),
  },
}));

describe('Project Financials Persistence and Rehydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console warnings/errors
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset Zustand store projects state
    useProjectStore.setState({
      projects: [
        {
          id: 'project-123',
          organizationId: 'org-123',
          propertyName: 'Sunset Heights',
          financials: {
            purchasePrice: 100000,
            loanAmount: 80000,
          },
        } as any,
      ],
      currentProject: {
        id: 'project-123',
        organizationId: 'org-123',
        propertyName: 'Sunset Heights',
        financials: {
          purchasePrice: 100000,
          loanAmount: 80000,
        },
      } as any,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Client-Side Store Action Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('Zustand store: updateProjectFinancials', () => {
    it('applies update optimistically and persists via fetch', async () => {
      mockGetIdToken.mockResolvedValueOnce('valid-token');
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as any);

      // Call store action
      const promise = useProjectStore.getState().updateProjectFinancials('project-123', {
        purchasePrice: 120000,
      });

      // Verify optimistic update has already applied
      expect(useProjectStore.getState().currentProject?.financials?.purchasePrice).toBe(120000);

      await promise;

      // Verify PATCH request details
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ financials: { purchasePrice: 120000 } }),
      });

      mockFetch.mockRestore();
    });

    it('rolls back store state and triggers toast if the server save fails', async () => {
      mockGetIdToken.mockResolvedValueOnce('valid-token');
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database timeout' }),
      } as any);

      // Verify pre-state
      expect(useProjectStore.getState().currentProject?.financials?.purchasePrice).toBe(100000);

      // Call action
      const promise = useProjectStore.getState().updateProjectFinancials('project-123', {
        purchasePrice: 120000,
      });

      // Optimistic update should be active
      expect(useProjectStore.getState().currentProject?.financials?.purchasePrice).toBe(120000);

      await promise;

      // Rollback should revert state
      expect(useProjectStore.getState().currentProject?.financials?.purchasePrice).toBe(100000);
      expect(mockToastError).toHaveBeenCalledWith('Database timeout');

      mockFetch.mockRestore();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Server-Side PATCH Route Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/projects/[id] API endpoint', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PATCH',
        body: JSON.stringify({ financials: { purchasePrice: 120000 } }),
      });
      mockVerifyIdToken.mockResolvedValueOnce({ status: 401, json: () => ({ error: 'Unauthorized' }) });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'project-123' }) });
      expect(response.status).toBe(401);
    });

    it('rejects non-members of the organization (403)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'attacker-1' });

      // Mock transaction reads
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: 'org-123',
          members: { 'owner-1': { role: 'Owner' } }, // Attacker is not a member
        }),
      });

      // Organization check
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'owner-1',
          teamMembers: [],
        }),
      });

      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PATCH',
        body: JSON.stringify({ financials: { purchasePrice: 120000 } }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'project-123' }) });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Access denied');
    });

    it('rejects scoped team members not assigned to the project (403)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'scoped-user-1' });

      // Mock project
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: 'org-123',
          members: {},
        }),
      });

      // Mock organization showing team member is scoped to project-999 (not project-123)
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'owner-1',
          teamMembers: [
            {
              id: 'scoped-user-1',
              status: 'active',
              isScoped: true,
              scopedProjectIds: ['project-999'],
            },
          ],
        }),
      });

      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PATCH',
        body: JSON.stringify({ financials: { purchasePrice: 120000 } }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'project-123' }) });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Access denied');
    });

    it('updates Firestore and syncs to Postgres on authorized write (200)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'owner-1', token: { name: 'Owner' } });

      // Mock transaction reads
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: 'org-123',
          propertyName: 'Sunset Heights',
          financials: { purchasePrice: 100000 },
        }),
      });

      // Organization check
      mockTransactionGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'owner-1',
          teamMembers: [],
        }),
      });

      // Mock get doc after transaction
      mockGetDoc.mockResolvedValueOnce({
        id: 'project-123',
        data: () => ({
          organizationId: 'org-123',
          propertyName: 'Sunset Heights',
          financials: { purchasePrice: 120000 },
        }),
      });

      const request = new NextRequest('http://localhost/api/projects/project-123', {
        method: 'PATCH',
        body: JSON.stringify({ financials: { purchasePrice: 120000 } }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'project-123' }) });
      expect(response.status).toBe(200);

      // Verify transaction updates
      expect(mockTransactionUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          financials: { purchasePrice: 120000 },
        })
      );

      // Verify sync to Postgres (REIL plane) was triggered
      expect(mockSyncProjectFinancials).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'project-123',
          financials: { purchasePrice: 120000 },
        })
      );
    });
  });
});
