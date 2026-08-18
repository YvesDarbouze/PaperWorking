import { NextRequest } from 'next/server';

// Mock variables for Jest hoisting
const mockVerifyIdToken = jest.fn();
const mockProjectDocGet = jest.fn();
const mockUserDocGet = jest.fn().mockResolvedValue({ exists: false });
const mockOrgDocGet = jest.fn().mockResolvedValue({ exists: false });
const mockSubDocGet = jest.fn();
const mockSubDocSet = jest.fn();
const mockSubDocUpdate = jest.fn();
const mockSubDocDelete = jest.fn();
const mockSubCollGet = jest.fn();
const mockProjectFilesCollGet = jest.fn();
const mockProjectFilesSet = jest.fn();

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
      if (colName === 'projectFolders') {
        return {
          where: () => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        };
      }
      // 'projects'
      return {
        doc: (id: string) => ({
          get: (...args: any[]) => mockProjectDocGet(id, ...args),
          collection: (subColName: string) => ({
            get: (...args: any[]) => mockSubCollGet(subColName, ...args),
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(subColName, ...args),
            }),
            doc: (docId: string) => ({
              get:    (...args: any[]) => mockSubDocGet(docId, ...args),
              set:    (...args: any[]) => mockSubDocSet(docId, ...args),
              update: (...args: any[]) => mockSubDocUpdate(docId, ...args),
              delete: (...args: any[]) => mockSubDocDelete(docId, ...args),
            }),
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

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date('2026-01-01T00:00:00.000Z'),
    delete: () => 'FIELD_DELETE',
    arrayUnion: (arg: any) => [arg],
  },
}));

// Import routes after mocks are defined
import { GET as getCommitments, POST as postCommitment } from '@/app/api/projects/[id]/commitments/route';
import { PATCH as patchCommitment, DELETE as deleteCommitment } from '@/app/api/projects/[id]/commitments/[cId]/route';
import { GET as getDocuments, POST as postDocument } from '@/app/api/projects/[id]/documents/route';

const PROJECT_ID = 'proj_security_123';
const LP1_UID = 'lp_user_001';
const LP1_EMAIL = 'lp1@test.com';
const LP2_UID = 'lp_user_002';
const LP2_EMAIL = 'lp2@test.com';
const LEAD_UID = 'lead_user_999';
const LEAD_EMAIL = 'lead@test.com';

const PARAMS_COLL = { params: Promise.resolve({ id: PROJECT_ID }) };
const PARAMS_DOC_LP1 = { params: Promise.resolve({ id: PROJECT_ID, cId: 'commit_lp1' }) };
const PARAMS_DOC_LP2 = { params: Promise.resolve({ id: PROJECT_ID, cId: 'commit_lp2' }) };

function mockReq(method: string, body?: object, token = 'valid-token'): NextRequest {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/commitments`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mockDocReq(method: string, body?: object, token = 'valid-token'): NextRequest {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/documents`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Party Portal Security Access Enforcement (v1.1 Security Standards)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Project mock data with active equity parties and phase permissions
  const mockProject = {
    exists: true,
    data: () => ({
      id: PROJECT_ID,
      ownerUid: LEAD_UID,
      organizationId: 'org_apex',
      members: {
        [LEAD_UID]: { uid: LEAD_UID, role: 'Lead Investor' },
      },
      equityParties: [
        {
          id: 'party_lp1',
          role: 'LP',
          name: 'LP One',
          email: LP1_EMAIL,
          memberId: LP1_UID,
          phasePermissions: {
            'phase-2': { canView: true, canEdit: true },
          },
        },
        {
          id: 'party_lp2',
          role: 'LP',
          name: 'LP Two',
          email: LP2_EMAIL,
          memberId: LP2_UID,
          phasePermissions: {
            'phase-2': { canView: true, canEdit: false }, // Read-only phase-2 access
          },
        },
      ],
    }),
  };

  it('rejects unauthenticated requests to commitments with 401', async () => {
    // Missing Authorization header entirely
    const reqEmpty = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/commitments`);
    const res = await getCommitments(reqEmpty, PARAMS_COLL);
    expect(res.status).toBe(401);
  });

  it('limits GET commitments list to caller own commitments for LPs', async () => {
    // Mock user auth to LP1
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP1_UID, email: LP1_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    // Mock commitments subcollection return
    const mockCommitments = [
      { id: 'commit_lp1', email: LP1_EMAIL, amountCents: 100000, createdByUid: LP1_UID },
      { id: 'commit_lp2', email: LP2_EMAIL, amountCents: 200000, createdByUid: LP2_UID },
      { id: 'commit_lead', email: LEAD_EMAIL, amountCents: 500000, createdByUid: LEAD_UID },
    ];
    mockSubCollGet.mockResolvedValueOnce({
      docs: mockCommitments.map(c => ({
        id: c.id,
        data: () => c,
      })),
    });

    const res = await getCommitments(mockReq('GET', undefined, 'token_lp1'), PARAMS_COLL);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.commitments.length).toBe(1);
    expect(data.commitments[0].id).toBe('commit_lp1');
  });

  it('rejects LP trying to update another investor commitment with 403', async () => {
    // LP1 tries to update LP2 commitment status
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP1_UID, email: LP1_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    // Existing commitment details (belongs to LP2)
    mockSubDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: 'commit_lp2', email: LP2_EMAIL, createdByUid: LP2_UID }),
    });

    const res = await patchCommitment(
      mockReq('PATCH', { status: 'cleared' }, 'token_lp1'),
      PARAMS_DOC_LP2
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('modify another investor');
  });

  it('prevents LPs from changing the email or partyType field on commitments', async () => {
    // LP1 trying to change email/partyType of their own commitment
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP1_UID, email: LP1_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    // Existing commitment (owned by LP1)
    mockSubDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: 'commit_lp1', email: LP1_EMAIL, createdByUid: LP1_UID, partyType: 'Investor' }),
    });

    const res = await patchCommitment(
      mockReq('PATCH', { email: 'hacker@test.com', partyType: 'LeadInvestor' }, 'token_lp1'),
      PARAMS_DOC_LP1
    );
    expect(res.status).toBe(403);
  });

  it('rejects LPs trying to DELETE commitments with 403', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP1_UID, email: LP1_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    const res = await deleteCommitment(
      mockReq('DELETE', undefined, 'token_lp1'),
      PARAMS_DOC_LP1
    );
    expect(res.status).toBe(403);
  });

  it('rejects LPs without phase-2 edit permissions from creating a commitment with 403', async () => {
    // LP2 has 'phase-2': { canView: true, canEdit: false }
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP2_UID, email: LP2_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    const res = await postCommitment(
      mockReq('POST', { name: 'LP Two', amountCents: 50000, partyType: 'Investor' }, 'token_lp2'),
      PARAMS_COLL
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Edit permission denied');
  });

  it('limits GET documents to caller own documents + public documents for LPs', async () => {
    // Mock user auth to LP1
    mockVerifyIdToken.mockResolvedValueOnce({ uid: LP1_UID, email: LP1_EMAIL });
    mockProjectDocGet.mockImplementation(() => mockProject);

    // Mock projectFiles collection get
    mockProjectFilesCollGet.mockResolvedValueOnce({
      docs: [
        { id: 'doc_lp1_own', data: () => ({ id: 'doc_lp1_own', projectId: PROJECT_ID, uploadedByUid: LP1_UID }) },
        { id: 'doc_lp2_other', data: () => ({ id: 'doc_lp2_other', projectId: PROJECT_ID, uploadedByUid: LP2_UID }) },
        { id: 'doc_public', data: () => ({ id: 'doc_public', projectId: PROJECT_ID, isPublic: true, category: 'Deal identity' }) },
      ],
    });

    // Mock project/documents subcollection get (subscription agreements, etc.)
    mockSubCollGet.mockResolvedValueOnce({
      docs: [
        { id: 'sub_agreement_party_lp1', data: () => ({ id: 'sub_agreement_party_lp1', category: 'Other', recipientUid: LP1_UID }) },
        { id: 'sub_agreement_party_lp2', data: () => ({ id: 'sub_agreement_party_lp2', category: 'Other', recipientUid: LP2_UID }) },
      ],
    });

    const res = await getDocuments(mockDocReq('GET', undefined, 'token_lp1'), PARAMS_COLL);
    expect(res.status).toBe(200);
    const data = await res.json();

    // LP1 should only see their own, the recipient sub agreement, and public documents
    const ids = data.documents.map((d: any) => d.id);
    expect(ids).toContain('doc_lp1_own');
    expect(ids).toContain('doc_public');
    expect(ids).toContain('sub_agreement_party_lp1');
    expect(ids).not.toContain('doc_lp2_other');
    expect(ids).not.toContain('sub_agreement_party_lp2');
  });
});
