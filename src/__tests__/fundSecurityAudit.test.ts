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
var mockDocGet = jest.fn();
var mockDocSet = jest.fn().mockResolvedValue(true);
var mockDocUpdate = jest.fn().mockResolvedValue(true);
var mockDocDelete = jest.fn().mockResolvedValue(true);

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
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(subColName, ...args),
            }),
            get: (...args: any[]) => mockSubCollGet(subColName, ...args),
            doc: (docId?: string) => {
              const targetId = docId || 'mock-subdoc-id';
              return {
                id: targetId,
                get: () => mockDocGet(subColName, targetId),
                set: (data: any) => mockDocSet(subColName, targetId, data),
                update: (data: any) => mockDocUpdate(subColName, targetId, data),
                delete: () => mockDocDelete(subColName, targetId),
                collection: (grandSubColName: string) => ({
                  doc: () => ({
                    set: jest.fn().mockResolvedValue(true)
                  })
                })
              };
            },
          }),
          update: (...args: any[]) => mockDocUpdate('projects', id, ...args),
        }),
      };
    },
    batch: () => ({
      delete: jest.fn(),
      update: jest.fn(),
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    }),
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

jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    capture: jest.fn().mockResolvedValue(true),
  },
}));

import { POST as postDocument } from '@/app/api/projects/[id]/documents/route';
import { POST as postCommitment } from '@/app/api/projects/[id]/commitments/route';
import { PATCH as patchCommitment } from '@/app/api/projects/[id]/commitments/[cId]/route';
import { PATCH as patchLoan } from '@/app/api/projects/[id]/loans/[loanId]/route';
import { POST as postLoans, GET as getLoans } from '@/app/api/projects/[id]/loans/route';
import { PATCH as patchHardMoneyTerms } from '@/app/api/projects/[id]/loans/hard-money-terms/route';
import { POST as postSba504 } from '@/app/api/projects/[id]/loans/sba504/route';
import { POST as postLockLoans } from '@/app/api/projects/[id]/loans/lock/route';
import { POST as postLoanEstimate, GET as getLoanEstimates } from '@/app/api/projects/[id]/loan-estimates/route';
import { POST as postChooseEstimate } from '@/app/api/projects/[id]/loan-estimates/[estimateId]/choose/route';
import { GET as getLenderPackage, POST as postLenderPackage } from '@/app/api/projects/[id]/lender-package/route';

describe('FD-39 — Security & Rules Audit Suite', () => {
  const PROJECT_ID = 'test_project_123';
  const SPONSOR_UID = 'sponsor_uid_123';
  const VENDOR_UID = 'vendor_uid_123';
  const LP_UID = 'lp_uid_123';

  const mockProjectDoc = {
    exists: true,
    data: () => ({
      ownerUid: SPONSOR_UID,
      propertyName: 'Test Real Estate',
      members: {
        [SPONSOR_UID]: 'owner',
      },
      equityParties: [
        {
          memberId: LP_UID,
          email: 'lp@example.com',
          role: 'LP',
        },
      ],
      financials: {
        purchasePrice: 1000000,
        f4AppraiserVendor: {
          marketplaceVendorId: VENDOR_UID,
          email: 'appraiser@example.com',
        },
        f4SurveyorVendor: {
          marketplaceVendorId: 'other_vendor_uid',
          email: 'surveyor@example.com',
        },
      },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectDocGet.mockResolvedValue(mockProjectDoc);
  });

  describe('1. Vendor Document Upload Boundaries', () => {
    it('allows Vendor (Appraiser) to upload file in their assigned category (Debt / Appraisal)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'appraiser@example.com',
      });
      mockProjectFoldersGet.mockResolvedValue({
        empty: false,
        docs: [{ id: 'appraisal-folder-id', data: () => ({ name: 'Debt' }) }],
      });

      const body = new FormData();
      body.append('category', 'Debt');
      body.append('documentType', 'appraisal');
      const mockFile = new File(['dummy_content'], 'appraisal_report_main.pdf', { type: 'application/pdf' });
      body.append('file', mockFile);

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body,
      });

      const res = await postDocument(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(201);
    });

    it('rejects Vendor (Appraiser) uploading files mapping to folders outside their scope (e.g. Closing)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'appraiser@example.com',
      });

      const body = new FormData();
      body.append('category', 'Closing');
      body.append('documentType', 'closing_disclosure');
      const mockFile = new File(['dummy_content'], 'closing_disclosure_main.pdf', { type: 'application/pdf' });
      body.append('file', mockFile);

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body,
      });

      const res = await postDocument(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('only authorized to upload documents to the "Debt" folder');
    });
  });

  describe('2. LP Commitment Self-Verification Prevention', () => {
    it('forces LP commitment status to pledged on POST', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/commitments`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({
          name: 'LP Pledged Fund',
          amountCents: 5000000,
          status: 'cleared',
        }),
      });

      const res = await postCommitment(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(201);
      expect(mockDocSet).toHaveBeenCalledWith('commitments', expect.any(String), expect.objectContaining({
        status: 'pledged',
      }));
    });

    it('blocks LP transitioning commitment to privileged statuses (e.g. cleared) via PATCH', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          createdByUid: LP_UID,
          email: 'lp@example.com',
          status: 'pledged',
        }),
      });

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/commitments/c_123`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({
          status: 'cleared',
        }),
      });

      const res = await patchCommitment(req, { params: Promise.resolve({ id: PROJECT_ID, cId: 'c_123' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Cannot self-clear or self-verify commitments');
    });
  });

  describe('3. Unified Loan endpoint authorization guards', () => {
    it('allows Lead to change financing route but blocks LPs', async () => {
      // 1. Lead POST succeeds
      mockVerifyIdToken.mockResolvedValue({
        uid: SPONSOR_UID,
        email: 'sponsor@example.com',
      });
      mockSubCollGet.mockResolvedValue({ empty: true, docs: [] });

      const req1 = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({ instrument: 'Conventional' }),
      });
      const res1 = await postLoans(req1, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res1.status).toBe(201);

      // 2. LP POST returns 403
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      const req2 = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({ instrument: 'Conventional' }),
      });
      const res2 = await postLoans(req2, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res2.status).toBe(403);
    });

    it('blocks LPs from updating loan record', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans/l_123`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({ status: 'Processing' }),
      });
      const res = await patchLoan(req, { params: Promise.resolve({ id: PROJECT_ID, loanId: 'l_123' }) });
      expect(res.status).toBe(403);
    });

    it('allows Appraiser vendor to update loan record status', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'appraiser@example.com',
      });
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'Application-Submitted',
          amountCents: 50000000,
        }),
      });

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans/l_123`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({ status: 'Processing' }),
      });
      const res = await patchLoan(req, { params: Promise.resolve({ id: PROJECT_ID, loanId: 'l_123' }) });
      expect(res.status).toBe(200);
    });

    it('blocks unauthorized Vendor (e.g. Surveyor) from updating loan record status', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'other_vendor_uid',
        email: 'surveyor@example.com',
      });
      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans/l_123`, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
        body: JSON.stringify({ status: 'Processing' }),
      });
      const res = await patchLoan(req, { params: Promise.resolve({ id: PROJECT_ID, loanId: 'l_123' }) });
      expect(res.status).toBe(403);
    });

    it('blocks non-Leads from locking loan terms', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loans/lock`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
      });
      const res = await postLockLoans(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(403);
    });
  });

  describe('4. Estimate Chooses & Custom Lender Checklist Packages', () => {
    it('blocks non-Leads from choosing loan estimates', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/loan-estimates/est_123/choose`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
      });
      const res = await postChooseEstimate(req, { params: Promise.resolve({ id: PROJECT_ID, estimateId: 'est_123' }) });
      expect(res.status).toBe(403);
    });

    it('blocks LPs from retrieving lender checklist package', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: LP_UID,
        email: 'lp@example.com',
      });
      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/lender-package`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
      });
      const res = await getLenderPackage(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(403);
    });

    it('allows Appraiser vendor to view lender checklist package', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'appraiser@example.com',
      });
      mockSubCollGet.mockResolvedValue({ empty: false, docs: [] });

      const req = new NextRequest(`https://example.com/api/projects/${PROJECT_ID}/lender-package`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid_token'
        },
      });
      const res = await getLenderPackage(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(200);
    });
  });
});
