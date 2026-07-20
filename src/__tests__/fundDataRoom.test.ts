import { NextRequest } from 'next/server';

// Mock variables for Jest hoisting
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockUserDocGet = jest.fn().mockResolvedValue({ exists: false });
var mockOrgDocGet = jest.fn().mockResolvedValue({ exists: false });
var mockProjectFoldersGet = jest.fn();
var mockProjectFoldersSet = jest.fn().mockResolvedValue(true);
var mockProjectFoldersUpdate = jest.fn().mockResolvedValue(true);
var mockProjectFilesCollGet = jest.fn();
var mockProjectFilesSet = jest.fn().mockResolvedValue(true);
var mockSubCollGet = jest.fn();
var mockWriteActivityLog = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (colName: string) => {
      if (colName === 'users') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockUserDocGet(...args),
          }),
        };
      }
      if (colName === 'organizations') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockOrgDocGet(...args),
          }),
        };
      }
      if (colName === 'projectFolders') {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: (...args: any[]) => mockProjectFoldersGet(...args),
              }),
              get: (...args: any[]) => mockProjectFoldersGet(...args),
            }),
            get: (...args: any[]) => mockProjectFoldersGet(...args),
          }),
          doc: (id?: string) => ({
            id: id || 'new-folder-123',
            set: (...args: any[]) => mockProjectFoldersSet(...args),
            update: (...args: any[]) => mockProjectFoldersUpdate(...args),
          }),
        };
      }
      if (colName === 'projectFiles') {
        return {
          where: () => ({
            get: (...args: any[]) => mockProjectFilesCollGet(...args),
          }),
          doc: () => ({
            set: (...args: any[]) => mockProjectFilesSet(...args),
          }),
        };
      }
      // projects
      return {
        doc: (id: string) => ({
          get: (...args: any[]) => mockProjectDocGet(id, ...args),
          collection: (subColName: string) => ({
            get: (...args: any[]) => mockSubCollGet(subColName, ...args),
          }),
        }),
      };
    },
  },
  adminStorage: {
    bucket: () => ({
      file: () => ({
        save: jest.fn().mockResolvedValue(true),
        makePublic: jest.fn().mockResolvedValue(true),
      }),
      name: 'mock-bucket',
    }),
  },
}));

jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: (...args: any[]) => mockWriteActivityLog(...args),
}));

jest.mock('@/lib/firebase/orgActivityWriter', () => ({
  logOrgActivity: jest.fn(),
}));

import { GET, POST } from '@/app/api/projects/[id]/documents/route';

describe('FD-38 — Fund Data Room structure API Scoping & Mapping', () => {
  const PROJECT_ID = 'project_data_room_test';
  const OWNER_UID = 'owner_user_123';
  const VENDOR_UID = 'vendor_user_456';
  const LP_UID = 'lp_user_789';

  const defaultProjectData = {
    ownerUid: OWNER_UID,
    organizationId: 'org_123',
    propertyName: '123 Wall Street',
    members: {
      [OWNER_UID]: { role: 'Lead Investor' },
    },
    equityParties: [
      {
        id: 'lp_party_789',
        memberId: LP_UID,
        email: 'lp@test.com',
        role: 'LP',
      },
    ],
    financials: {
      f4ClosingAttorneyVendor: {
        marketplaceVendorId: VENDOR_UID,
        email: 'vendor@closing.com',
        name: 'John Attorney',
        firm: 'Closing Partners LLP',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserDocGet.mockResolvedValue({ exists: false });
    mockOrgDocGet.mockResolvedValue({ exists: false });
  });

  /* ═══════════════════════════════════════════════════════════════
     1. GET Route Tests
     ═══════════════════════════════════════════════════════════════ */
  describe('GET Scoping', () => {
    it('restricts document access for a Vendor to only their assigned folder (Closing)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'vendor@closing.com',
      });

      mockProjectDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultProjectData,
      });

      // Mock folders
      mockProjectFoldersGet.mockResolvedValue({
        docs: [
          { id: 'folder_closing', data: () => ({ name: 'Closing' }) },
          { id: 'folder_debt', data: () => ({ name: 'Debt' }) },
        ],
      });

      // Mock projectFiles docs (Debt, Closing, and Title)
      mockProjectFilesCollGet.mockResolvedValue({
        docs: [
          {
            id: 'file_appraisal_1',
            data: () => ({
              projectId: PROJECT_ID,
              name: 'Appraisal_Report.pdf',
              ocrDocumentType: 'appraisal',
              category: 'Debt',
              uploadedByUid: OWNER_UID,
            }),
          },
          {
            id: 'file_cd_1',
            data: () => ({
              projectId: PROJECT_ID,
              name: 'Closing_Disclosure.pdf',
              ocrDocumentType: 'closing_disclosure',
              category: 'Closing',
              uploadedByUid: OWNER_UID,
            }),
          },
        ],
      });

      // Mock subcollection docs
      mockSubCollGet.mockResolvedValue({
        docs: [],
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/documents`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      const res = await GET(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.documents).toHaveLength(1);
      expect(json.documents[0].id).toBe('file_cd_1');
      expect(json.documents[0].folderName).toBe('Closing');
      expect(json.documents[0].folderId).toBe('folder_closing');
    });

    it('restricts document access for an LP to their own subscription agreement & public files', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@test.com',
      });

      mockProjectDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultProjectData,
      });

      mockProjectFoldersGet.mockResolvedValue({
        docs: [
          { id: 'folder_equity', data: () => ({ name: 'Equity' }) },
          { id: 'folder_closing', data: () => ({ name: 'Closing' }) },
        ],
      });

      mockProjectFilesCollGet.mockResolvedValue({
        docs: [
          {
            id: 'sub_agreement_lp_party_789',
            data: () => ({
              projectId: PROJECT_ID,
              name: 'Subscription_Agreement.pdf',
              category: 'Equity',
              uploadedByUid: OWNER_UID,
            }),
          },
          {
            id: 'sub_agreement_another_lp',
            data: () => ({
              projectId: PROJECT_ID,
              name: 'Other_Subscription_Agreement.pdf',
              category: 'Equity',
              uploadedByUid: OWNER_UID,
            }),
          },
          {
            id: 'file_public_1',
            data: () => ({
              projectId: PROJECT_ID,
              name: 'Deal_Teaser.pdf',
              category: 'Deal identity',
              isPublic: true,
              uploadedByUid: OWNER_UID,
            }),
          },
        ],
      });

      mockSubCollGet.mockResolvedValue({
        docs: [],
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/documents`, {
        headers: { Authorization: 'Bearer valid-token' },
      });

      const res = await GET(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.documents).toHaveLength(2);
      
      const ids = json.documents.map((d: any) => d.id);
      expect(ids).toContain('sub_agreement_lp_party_789');
      expect(ids).toContain('file_public_1');
      expect(ids).not.toContain('sub_agreement_another_lp');
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     2. POST Route Tests (Auto-mapping)
     ═══════════════════════════════════════════════════════════════ */
  describe('POST Auto-mapping', () => {
    it('automatically ensures and maps appraisal document to the Debt folder', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: OWNER_UID,
        email: 'owner@test.com',
      });

      mockProjectDocGet.mockResolvedValue({
        exists: true,
        data: () => defaultProjectData,
      });

      // Mock folder lookup to return empty (causing dynamic folder creation)
      mockProjectFoldersGet.mockResolvedValue({ empty: true, docs: [] });

      const formData = new FormData();
      const mockFile = new File(['dummy_content'], 'appraisal_report_main.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);
      formData.append('category', 'Debt');
      formData.append('documentType', 'appraisal');

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/documents`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: formData,
      });

      const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(201);

      // Verify folderRef.set was called to provision folder 'Debt'
      expect(mockProjectFoldersSet).toHaveBeenCalled();
      const lastCallArgs = mockProjectFoldersSet.mock.calls[0][0];
      expect(lastCallArgs.name).toBe('Debt');
      expect(lastCallArgs.phase).toBe('Debt');

      // Verify fileRecord.set was called with resolved folderId 'new-folder-123'
      expect(mockProjectFilesSet).toHaveBeenCalled();
      const fileRecord = mockProjectFilesSet.mock.calls[0][0];
      expect(fileRecord.folderId).toBe('new-folder-123');
      expect(fileRecord.ocrDocumentType).toBe('appraisal');
    });
  });
});
