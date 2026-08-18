/** @jest-environment node */
import { POST, GET } from '@/app/api/projects/[id]/documents/route';
import { GET as downloadGET } from '@/app/api/projects/[id]/documents/[docId]/download/route';
import { NextRequest, NextResponse } from 'next/server';

const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(true);
const mockUpdate = jest.fn().mockResolvedValue(true);
const mockVerifyProjectAccessAndRole = jest.fn();
const mockSave = jest.fn();
const mockMakePublic = jest.fn();
const mockDownload = jest.fn();
const mockExists = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn().mockImplementation((colName) => ({
      doc: jest.fn().mockImplementation((docId) => ({
        get: (...args: any[]) => mockGet(colName, docId, ...args),
        set: (...args: any[]) => mockSet(colName, docId, ...args),
        update: (...args: any[]) => mockUpdate(colName, docId, ...args),
        collection: jest.fn().mockImplementation((subColName) => ({
          get: (...args: any[]) => mockGet(`${colName}/${docId}/${subColName}`, 'query', ...args),
          add: jest.fn().mockResolvedValue({ id: 'new-id' }),
        })),
      })),
      where: jest.fn().mockImplementation((field, op, val) => ({
        where: jest.fn().mockImplementation(() => ({
          get: (...args: any[]) => mockGet(colName, 'query', ...args),
          limit: jest.fn().mockImplementation(() => ({
            get: (...args: any[]) => mockGet(colName, 'query-limit', ...args),
          })),
        })),
        limit: jest.fn().mockImplementation(() => ({
          get: (...args: any[]) => mockGet(colName, 'query-limit', ...args),
        })),
        get: (...args: any[]) => mockGet(colName, 'query', ...args),
      })),
    })),
  },
  adminStorage: {
    bucket: () => ({
      file: (path: string) => ({
        save: (...args: any[]) => mockSave(path, ...args),
        makePublic: (...args: any[]) => mockMakePublic(path, ...args),
        download: (...args: any[]) => mockDownload(path, ...args),
        exists: (...args: any[]) => mockExists(path, ...args),
      }),
      name: 'mock-bucket',
    }),
  },
}));

jest.mock('@/lib/firebase-admin/project-guard', () => ({
  verifyProjectAccessAndRole: (...args: any[]) => mockVerifyProjectAccessAndRole(...args),
}));

const mockRequireAuth = jest.fn();
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
  isAuthError: (result: any) => result instanceof NextResponse,
}));

// Helper to set mockGet implementation with automatic query defaults
function mockFirestoreGet(impl: (col: string, docId: string) => any) {
  mockGet.mockImplementation((col, docId) => {
    const custom = impl(col, docId);
    if (custom !== undefined) {
      return custom;
    }
    if (docId === 'query' || docId === 'query-limit') {
      return { empty: true, docs: [] };
    }
    return { exists: false, data: () => ({}) };
  });
}

describe('DM-20: Media and Documents Security & Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((col, docId) => {
      if (docId === 'query' || docId === 'query-limit') {
        return { empty: true, docs: [] };
      }
      return { exists: false, data: () => ({}) };
    });
  });

  describe('POST /api/projects/[id]/documents (Upload)', () => {
    it('saves file private in GCS (no makePublic) and returns secure download URL', async () => {
      // 1. Mock requireAuth for Lead Investor
      mockRequireAuth.mockResolvedValue({
        uid: 'user_lead',
        token: { email: 'lead@example.com' },
      });

      // 2. Mock project access check
      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: { organizationId: 'org_123', members: { user_lead: { role: 'Lead Investor' } } },
        role: 'Lead Investor',
      });

      // 3. Mock document sets/gets
      mockFirestoreGet((col, docId) => {
        if (col === 'projectFolders') {
          return { empty: true, docs: [] };
        }
        if (docId !== 'query' && docId !== 'query-limit') {
          return { exists: true, data: () => ({}) };
        }
      });
      mockSet.mockResolvedValue(true);
      mockSave.mockResolvedValue(true);

      // Create dummy file FormData
      const formData = new FormData();
      const file = new File(['dummy file content'], 'contract.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('category', 'Legal/Contracts');
      formData.append('documentType', 'closing_disclosure');

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await POST(req, { params: Promise.resolve({ id: 'proj_123' }) });
      if (response.status !== 201) {
        console.error('UPLOAD FAIL DETAIL:', await response.json());
      }
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.docId).toBeDefined();
      expect(json.downloadUrl).toContain('/api/projects/proj_123/documents/');
      expect(json.downloadUrl).toContain('/download');
      
      // Crucial: check that makePublic was NEVER called to enforce GCS privacy!
      expect(mockMakePublic).not.toHaveBeenCalled();

      // Check Firestore doc contains expected fields
      const savedDoc = mockSet.mock.calls[1][2];
      expect(savedDoc.isControlEvidence).toBe(true);
      expect(savedDoc.purpose).toBe('control_evidence');
    });
  });

  describe('GET /api/projects/[id]/documents (List) & Visibility guards', () => {
    it('permits access to project documents for private deals only to members', async () => {
      // Mock unauthenticated or unauthorized
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));
      
      // Mock no published listing (default PRIVATE)
      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
        return { exists: false };
      });

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(403);
    });

    it('permits access to authenticated subscribers for marketplace deals', async () => {
      // Mock auth for subscriber
      mockRequireAuth.mockResolvedValue({
        uid: 'user_sub',
        token: { email: 'sub@example.com' },
      });
      // Mock not direct project member
      mockVerifyProjectAccessAndRole.mockResolvedValue(null);

      // Mock published marketplace listing
      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return {
            empty: false,
            docs: [{
              data: () => ({ visibilityMode: 'MARKETPLACE', status: 'published' })
            }]
          };
        }
        if (col === 'users' && docId === 'user_sub') {
          return {
            exists: true,
            data: () => ({
              subscriptionPlan: 'Standard',
              subscriptionStatus: 'active',
            })
          };
        }
        if (col === 'projects' && docId === 'proj_123') {
          return { exists: true, data: () => ({ id: 'proj_123', propertyName: 'Prop' }) };
        }
        if (col === 'projectFiles') {
          return { docs: [] };
        }
        if (col === 'projectFolders') {
          return { docs: [] };
        }
      });

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(200);
    });

    it('denies marketplace deal docs to unauthenticated users or non-subscribers', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_free',
        token: { email: 'free@example.com' },
      });
      mockVerifyProjectAccessAndRole.mockResolvedValue(null);

      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return {
            empty: false,
            docs: [{
              data: () => ({ visibilityMode: 'MARKETPLACE', status: 'published' })
            }]
          };
        }
        if (col === 'users' && docId === 'user_free') {
          return {
            exists: true,
            data: () => ({
              subscriptionPlan: 'None',
              subscriptionStatus: 'inactive',
            })
          };
        }
      });

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(403);
    });

    it('denies public solicited deal docs to anonymous/unauthenticated users', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return {
            empty: false,
            docs: [{
              data: () => ({ visibilityMode: 'PUBLIC_SOLICITED', status: 'published' })
            }]
          };
        }
        if (col === 'projects' && docId === 'proj_123') {
          return { exists: true, data: () => ({ id: 'proj_123' }) };
        }
        if (col === 'projectFiles') {
          return { docs: [] };
        }
        if (col === 'projectFolders') {
          return { docs: [] };
        }
      });

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/projects/[id]/documents/[docId]/download (Secure streaming gateway)', () => {
    it('streams private GCS file securely if permitted', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_lead',
        token: { email: 'lead@example.com' },
      });
      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: { organizationId: 'org_123', members: { user_lead: { role: 'Lead Investor' } } },
        role: 'Lead Investor',
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'projectFiles' && docId === 'doc_123') {
          return {
            exists: true,
            data: () => ({
              projectId: 'proj_123',
              storagePath: 'projects/proj_123/closing_docs/file.pdf',
              fileType: 'application/pdf',
              name: 'file.pdf',
            }),
          };
        }
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
      });

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from('pdf bytes data')]);

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents/doc_123/download', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await downloadGET(req, { params: Promise.resolve({ id: 'proj_123', docId: 'doc_123' }) });
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      
      const bodyText = await response.text();
      expect(bodyText).toBe('pdf bytes data');
    });

    it('rejects path traversal for docId === download', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_lead',
        token: { email: 'lead@example.com' },
      });
      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: { organizationId: 'org_123', members: { user_lead: { role: 'Lead Investor' } } },
        role: 'Lead Investor',
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
      });

      // Path parameter tries to traverse to another project folder
      const req = new NextRequest('http://localhost/api/projects/proj_123/documents/download?path=projects/proj_other/secret.pdf', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await downloadGET(req, { params: Promise.resolve({ id: 'proj_123', docId: 'download' }) });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('outside project directory');
    });

    it('allows valid project path for docId === download', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_lead',
        token: { email: 'lead@example.com' },
      });
      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: { organizationId: 'org_123', members: { user_lead: { role: 'Lead Investor' } } },
        role: 'Lead Investor',
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
      });

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from('checklist pdf bytes')]);

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents/download?path=projects/proj_123/closing_docs/file.pdf', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await downloadGET(req, { params: Promise.resolve({ id: 'proj_123', docId: 'download' }) });
      expect(response.status).toBe(200);
      const bodyText = await response.text();
      expect(bodyText).toBe('checklist pdf bytes');
    });
  });

  describe('RM-2: Phase-Scoped Document Permissions', () => {
    it('saves documents with target phase when passed in POST', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_lead',
        token: { email: 'lead@example.com' },
      });

      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: { organizationId: 'org_123', members: { user_lead: { role: 'Lead Investor' } } },
        role: 'Lead Investor',
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'projectFolders') {
          return { empty: true, docs: [] };
        }
        if (docId !== 'query' && docId !== 'query-limit') {
          return { exists: true, data: () => ({}) };
        }
      });
      mockSet.mockResolvedValue(true);
      mockSave.mockResolvedValue(true);

      const formData = new FormData();
      const file = new File(['dummy file content'], 'psa.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('category', 'Purchase Agreement');
      formData.append('documentType', 'purchase_agreement');
      formData.append('phase', 'phase-1');

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      const response = await POST(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.phase).toBe('phase-1');

      // Verify phase is saved in Firestore record
      const savedDoc = mockSet.mock.calls[1][2];
      expect(savedDoc.phase).toBe('phase-1');
    });

    it('denies a team member with Fund-phase access from downloading a Hold-phase attachment', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_team_member',
        token: { email: 'member@example.com' },
      });

      // Member has Phase 2 (Fund) view, but NOT Phase 3 (Hold)
      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: {
          organizationId: 'org_123',
          members: {
            user_team_member: {
              role: 'co_buyer',
              phasePermissions: {
                'phase-2': { canView: true, canEdit: false },
                'phase-3': { canView: false, canEdit: false },
              },
            },
          },
        },
        role: 'co_buyer',
        phasePermissions: {
          'phase-2': { canView: true, canEdit: false },
          'phase-3': { canView: false, canEdit: false },
        },
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'projectFiles' && docId === 'doc_hold_123') {
          return {
            exists: true,
            data: () => ({
              projectId: 'proj_123',
              storagePath: 'projects/proj_123/rehab/rehab_invoice.pdf',
              fileType: 'application/pdf',
              name: 'rehab_invoice.pdf',
              phase: 'phase-3',
            }),
          };
        }
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
      });

      mockExists.mockResolvedValue([true]);
      mockDownload.mockResolvedValue([Buffer.from('rehab details')]);

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents/doc_hold_123/download', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await downloadGET(req, { params: Promise.resolve({ id: 'proj_123', docId: 'doc_hold_123' }) });
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('View permission disabled for phase-3');
    });

    it('filters out Hold-phase documents from documents list for a team member who lacks access', async () => {
      mockRequireAuth.mockResolvedValue({
        uid: 'user_team_member',
        token: { email: 'member@example.com' },
      });

      mockVerifyProjectAccessAndRole.mockResolvedValue({
        project: {
          organizationId: 'org_123',
          members: {
            user_team_member: {
              role: 'co_buyer',
              phasePermissions: {
                'phase-2': { canView: true, canEdit: false },
                'phase-3': { canView: false, canEdit: false },
              },
            },
          },
        },
        role: 'co_buyer',
        phasePermissions: {
          'phase-2': { canView: true, canEdit: false },
          'phase-3': { canView: false, canEdit: false },
        },
      });

      mockFirestoreGet((col, docId) => {
        if (col === 'projectFiles') {
          return {
            docs: [
              {
                id: 'doc_fund_123',
                data: () => ({
                  id: 'doc_fund_123',
                  projectId: 'proj_123',
                  name: 'loan_estimate.pdf',
                  phase: 'phase-2',
                  uploadedByUid: 'user_team_member',
                }),
              },
              {
                id: 'doc_hold_123',
                data: () => ({
                  id: 'doc_hold_123',
                  projectId: 'proj_123',
                  name: 'rehab_invoice.pdf',
                  phase: 'phase-3',
                  uploadedByUid: 'user_team_member',
                }),
              },
            ],
          };
        }
        if (col === 'projects' && docId === 'proj_123') {
          return { exists: true, data: () => ({ id: 'proj_123', organizationId: 'org_123' }) };
        }
        if (col === 'projectFolders') {
          return { docs: [] };
        }
        if (col === 'dealListings') {
          return { empty: true, docs: [] };
        }
      });

      const req = new NextRequest('http://localhost/api/projects/proj_123/documents', {
        method: 'GET',
        headers: { Authorization: 'Bearer valid-token' },
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.documents.length).toBe(1);
      expect(json.documents[0].id).toBe('doc_fund_123');
    });
  });
});
