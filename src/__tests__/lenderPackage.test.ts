import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockUserDocGet = jest.fn();
var mockSubDocGet = jest.fn();
var mockSubDocSet = jest.fn();
var mockSubDocUpdate = jest.fn();
var mockSubDocDelete = jest.fn();
var mockSubCollGet = jest.fn();
var mockBatchCommit = jest.fn();
var mockBatchDelete = jest.fn();
var mockBatchSet = jest.fn();

// Mock Firestore batch
var mockBatch = jest.fn(() => ({
  set: (...args: any[]) => mockBatchSet(...args),
  delete: (...args: any[]) => mockBatchDelete(...args),
  commit: (...args: any[]) => mockBatchCommit(...args),
}));

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    batch: () => mockBatch(),
    collection: (_colName: string) => {
      // Check projectFolders or projectFiles
      if (_colName === 'projectFolders') {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: (...args: any[]) => mockSubCollGet(...args)
              })
            })
          }),
          doc: () => ({
            set: (...args: any[]) => mockSubDocSet(...args)
          })
        };
      }
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(...args),
            }),
            get: (...args: any[]) => mockSubCollGet(...args),
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockSubDocGet(...args),
              set: (...args: any[]) => mockSubDocSet(...args),
              update: (...args: any[]) => mockSubDocUpdate(...args),
              delete: (...args: any[]) => mockSubDocDelete(...args),
            }),
          }),
        }),
      };
    },
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date('2026-07-19T00:00:00.000Z'),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes
   ────────────────────────────────────────────────────────────────────────── */
import { GET as getList, POST as createItem } from '@/app/api/projects/[id]/lender-package/route';
import { PATCH as updateItem, DELETE as deleteItem } from '@/app/api/projects/[id]/lender-package/[itemId]/route';
import { POST as provisionFolder } from '@/app/api/projects/[id]/lender-package/debt-folder/route';

describe('Card F3.2 Lender Package Checklist API Tests', () => {
  const PROJECT_ID = 'proj_test_456';
  const OWNER_UID = 'user_sponsor_seed';

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'sponsor@apex.com',
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: { financingType: 'Financed' }
      })
    });

    mockBatchCommit.mockResolvedValue(undefined);
  });

  describe('GET /api/projects/[id]/lender-package', () => {
    it('seeds Conventional package checklist when collection is empty and loan is Conventional', async () => {
      // Mock empty checklist subcollection
      mockSubCollGet.mockResolvedValueOnce({ empty: true });

      // Mock loans subcollection return Conventional loan record
      mockSubCollGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          { data: () => ({ instrument: 'Conventional' }) }
        ]
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await getList(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(200);
      expect(mockBatchSet).toHaveBeenCalledTimes(7); // Conventional has 7 customary documents
      
      const body = await res.json();
      expect(body.items).toHaveLength(7);
      expect(body.items[0].name).toBe('3yr Personal Tax Returns');
    });

    it('seeds Hard Money package checklist when collection is empty and loan is Hard Money', async () => {
      // Mock empty checklist subcollection
      mockSubCollGet.mockResolvedValueOnce({ empty: true });

      // Mock loans subcollection return Hard Money loan record
      mockSubCollGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          { data: () => ({ instrument: 'Hard Money' }) }
        ]
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await getList(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(200);
      expect(mockBatchSet).toHaveBeenCalledTimes(4); // Hard Money has 4 customary documents
      
      const body = await res.json();
      expect(body.items).toHaveLength(4);
      expect(body.items[0].name).toBe('Purchase Contract');
    });
  });

  describe('POST /api/projects/[id]/lender-package', () => {
    it('creates a custom checklist item successfully', async () => {
      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock'
        },
        body: JSON.stringify({ name: 'Environmental Phase I' })
      });

      const res = await createItem(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(201);
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Environmental Phase I',
          isCustom: true,
          status: 'Pending',
          reminderCadence: 'none'
        })
      );
    });
  });

  describe('PATCH & DELETE actions', () => {
    it('updates item status, file metadata and reminder cadence via PATCH', async () => {
      mockSubDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: 'Debt Schedule',
          status: 'Pending'
        })
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package/item_1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock'
        },
        body: JSON.stringify({
          status: 'Uploaded',
          fileId: 'file_999',
          fileName: 'debt_schedule.pdf',
          fileUrl: 'https://test/debt_schedule.pdf',
          reminderCadence: 'daily'
        })
      });

      const res = await updateItem(req, { params: Promise.resolve({ id: PROJECT_ID, itemId: 'item_1' }) });

      expect(res.status).toBe(200);
      expect(mockSubDocUpdate).toHaveBeenCalledWith({
        status: 'Uploaded',
        fileId: 'file_999',
        fileName: 'debt_schedule.pdf',
        fileUrl: 'https://test/debt_schedule.pdf',
        reminderCadence: 'daily'
      });
    });

    it('deletes item successfully via DELETE', async () => {
      mockSubDocGet.mockResolvedValue({ exists: true });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package/item_1`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await deleteItem(req, { params: Promise.resolve({ id: PROJECT_ID, itemId: 'item_1' }) });

      expect(res.status).toBe(200);
      expect(mockSubDocDelete).toHaveBeenCalled();
    });
  });

  describe('POST /api/projects/[id]/lender-package/debt-folder', () => {
    it('provisions a Debt folder in projectFolders if it does not exist', async () => {
      // Mock query returns empty (no Debt folder found)
      mockSubCollGet.mockResolvedValueOnce({ empty: true });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/lender-package/debt-folder`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await provisionFolder(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(201);
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Debt',
          phase: 'Find & Fund'
        })
      );
    });
  });
});
