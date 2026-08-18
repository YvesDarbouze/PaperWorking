/**
 * Capital Raise Commitments — No Hardcoded Investor List (Regression Tests)
 *
 * Background: phase-1/page.tsx used to render a hardcoded INVESTORS constant
 * (fictional names and pledge amounts) inside the Capital Raising task panel,
 * presenting fabricated capital-raise progress to every user.
 *
 * Fix (already in place):
 *   - CrowdfundingTracker.tsx uses a real-time Firestore onSnapshot subscription
 *     to projects/{projectId}/commitments, with no hardcoded data.
 *   - An honest empty state ("No investors added yet") is shown when the
 *     collection is empty.
 *   - Writes go through validated, auth-gated API routes that persist to Firestore
 *     and attribute each commitment to the creating user.
 *   - Non-members are rejected with 403.
 *
 * Evidence in tests:
 *   STATIC  — no hardcoded investor constant in CrowdfundingTracker or phase-1 page;
 *             onSnapshot used for live reads; empty state present.
 *   API     — POST creates a persisted commitment (201); unauthenticated → 401;
 *             non-member → 403; invalid body → 422; PATCH updates status;
 *             DELETE removes; GET returns membership-scoped commitments;
 *             status cycle is validated server-side; commitment survives PATCH
 *             (persists through the update call).
 */

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars — must be var so Jest hoisting sees them before jest.mock()
   ────────────────────────────────────────────────────────────────────────── */
const mockVerifyIdToken      = jest.fn();
const mockProjectDocGet      = jest.fn();
const mockProjectDocUpdate   = jest.fn();
const mockUserDocGet         = jest.fn();
const mockSubDocGet          = jest.fn();
const mockSubDocSet          = jest.fn();
const mockSubDocUpdate       = jest.fn();
const mockSubDocDelete       = jest.fn();
const mockSubCollGet         = jest.fn();

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock — collection-aware, with nested subcollection support
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (_colName: string) => {
      if (_colName === 'users') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockUserDocGet(...args),
          }),
        };
      }
      // 'projects'
      return {
        doc: () => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: () => ({
            doc: () => ({
              get:    (...args: any[]) => mockSubDocGet(...args),
              set:    (...args: any[]) => mockSubDocSet(...args),
              update: (...args: any[]) => mockSubDocUpdate(...args),
              delete: (...args: any[]) => mockSubDocDelete(...args),
            }),
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(...args),
            }),
          }),
        }),
      };
    },
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date('2026-01-01T00:00:00.000Z'),
    delete: () => 'FIELD_DELETE',
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes AFTER mocks are in place
   ────────────────────────────────────────────────────────────────────────── */
import { GET, POST }    from '@/app/api/projects/[id]/commitments/route';
import { PATCH, DELETE } from '@/app/api/projects/[id]/commitments/[cId]/route';

/* ──────────────────────────────────────────────────────────────────────────
   Test constants
   ────────────────────────────────────────────────────────────────────────── */
const PROJECT_ID = 'proj_test_abc';
const OWNER_UID  = 'user_owner_001';
const COMMIT_ID  = 'commit_xyz_999';

const PARAMS_COLL  = { params: Promise.resolve({ id: PROJECT_ID }) };
const PARAMS_DOC   = { params: Promise.resolve({ id: PROJECT_ID, cId: COMMIT_ID }) };

function req(method: string, body?: object, token = 'valid-token'): NextRequest {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/commitments`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** A project document where OWNER_UID is a direct member — bypasses org check. */
function memberProject() {
  return {
    exists: true,
    data: () => ({
      ownerUid: OWNER_UID,
      members: { [OWNER_UID]: true },
      organizationId: 'org_test_999',
    }),
  };
}

/** A project document where the test uid is NOT in members and belongs to a different org. */
function foreignProject() {
  return {
    exists: true,
    data: () => ({
      ownerUid: OWNER_UID,
      members: {},
      organizationId: 'org_test_999',
    }),
  };
}

/** A user document for the owner — matches `organizationId` in memberProject(). */
function ownerUserDoc() {
  return {
    exists: true,
    data: () => ({
      uid: OWNER_UID,
      organizationId: 'org_test_999',
    }),
  };
}

/** A user doc that belongs to a different org (non-member). */
function intruderUserDoc() {
  return {
    exists: true,
    data: () => ({
      uid: 'intruder_uid',
      organizationId: 'completely_different_org',
      personalOrganizationId: 'completely_different_org',
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

/* ══════════════════════════════════════════════════════════════════════════
   STATIC — no hardcoded fake data artifacts
   ══════════════════════════════════════════════════════════════════════════ */
const SRC = path.resolve(__dirname, '..');

function read(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const TRACKER    = read('components/project/CrowdfundingTracker.tsx');
const PHASE1     = read('app/dashboard/projects/[id]/phase-1/page.tsx');

describe('CrowdfundingTracker.tsx — no hardcoded investor data', () => {

  it('st_no_dummy_investors: no INVESTORS, DUMMY_INVESTORS, or mockInvestors constant', () => {
    expect(TRACKER).not.toMatch(/(?:const|let|var)\s+(?:INVESTORS|DUMMY_INVESTORS|mockInvestors|fakeInvestors)/);
  });

  it('st_no_hardcoded_names: no string literals that look like fictional bios ("Pledged", "Daniel", etc. in a data array)', () => {
    // A hardcoded list would appear as a JS array literal with name: 'John Smith'
    // We check that the text "name: '" does not appear inside a data constant
    expect(TRACKER).not.toMatch(/(?:const|let|var)\s+\w+[\s\S]*\[\s*\{[^}]*name:\s*['"][A-Z]/);
  });

  it('st_uses_onsnapshot: reads commitments from Firestore onSnapshot, not a constant', () => {
    expect(TRACKER).toContain('onSnapshot(');
    expect(TRACKER).toContain("'projects', projectId, 'commitments'");
  });

  it('st_empty_state: honest empty state shown when no commitments', () => {
    expect(TRACKER).toContain('No investors added yet');
  });

  it('st_writes_to_api: adds/updates/removes go through API routes, not direct Firestore writes', () => {
    expect(TRACKER).toContain('/api/projects/');
    expect(TRACKER).toContain('/commitments');
    expect(TRACKER).toContain("method: 'POST'");
    expect(TRACKER).toContain("method: 'PATCH'");
    expect(TRACKER).toContain("method: 'DELETE'");
  });

  it('st_token_on_writes: all write calls include the Firebase auth token', () => {
    expect(TRACKER).toContain('Authorization');
    expect(TRACKER).toContain('getToken()');
  });

  it('st_phase1_uses_tracker: phase-1 page delegates to CrowdfundingTracker (no inline list)', () => {
    expect(PHASE1).toContain('<CrowdfundingTracker');
    expect(PHASE1).not.toMatch(/(?:const|let|var)\s+(?:INVESTORS|investors)\s*=/);
  });

});

/* ══════════════════════════════════════════════════════════════════════════
   API — GET /api/projects/[id]/commitments
   ══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/projects/[id]/commitments', () => {

  it('get_401_no_token: rejects unauthenticated request', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = await GET(req('GET', undefined, 'bad'), PARAMS_COLL);
    expect(res.status).toBe(401);
  });

  it('get_403_non_member: rejects a user not in project members', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_uid' });
    // First call: verifyProjectMembership — project exists but intruder not in members
    mockProjectDocGet.mockResolvedValue(foreignProject());
    // hasProjectAccess: user is not in the org
    mockUserDocGet.mockResolvedValue(intruderUserDoc());

    const res = await GET(req('GET'), PARAMS_COLL);
    expect(res.status).toBe(403);
  });

  it('get_200_returns_commitments: returns commitment list to a member', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());

    mockSubCollGet.mockResolvedValueOnce({
      docs: [
        {
          id: COMMIT_ID,
          data: () => ({
            name: 'Alice Chen',
            amountCents: 2500000,
            status: 'pledged',
            email: 'alice@example.com',
            notes: null,
            createdAt: { toDate: () => new Date('2026-03-01') },
            updatedAt: { toDate: () => new Date('2026-03-01') },
          }),
        },
      ],
    });

    const res = await GET(req('GET'), PARAMS_COLL);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.commitments).toHaveLength(1);
    expect(body.commitments[0].name).toBe('Alice Chen');
    expect(body.commitments[0].amountCents).toBe(2500000);
    expect(body.commitments[0].status).toBe('pledged');
  });

});

/* ══════════════════════════════════════════════════════════════════════════
   API — POST /api/projects/[id]/commitments
   ══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/projects/[id]/commitments', () => {

  it('post_401_no_token: rejects unauthenticated request', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = await POST(req('POST', { name: 'Test', amountCents: 50000 }, 'bad'), PARAMS_COLL);
    expect(res.status).toBe(401);
  });

  it('post_403_non_member: rejects user not on the project', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_uid' });
    mockProjectDocGet.mockResolvedValue(foreignProject());
    mockUserDocGet.mockResolvedValue(intruderUserDoc());

    const res = await POST(
      req('POST', { name: 'Intruder', amountCents: 1000 }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(403);
  });

  it('post_422_missing_name: rejects body without investor name', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());

    const res = await POST(
      req('POST', { amountCents: 50000 }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it('post_422_zero_amount: rejects zero amountCents', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());

    const res = await POST(
      req('POST', { name: 'Bob', amountCents: 0 }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/amountCents/i);
  });

  it('post_422_negative_amount: rejects negative amountCents', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());

    const res = await POST(
      req('POST', { name: 'Bob', amountCents: -1000 }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(422);
  });

  it('post_422_invalid_status: rejects unknown status value', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());

    const res = await POST(
      req('POST', { name: 'Bob', amountCents: 100000, status: 'fake_status' }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/status/i);
  });

  it('post_201_creates_commitment: persists real commitment and returns 201', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocSet.mockResolvedValueOnce(undefined);

    const res = await POST(
      req('POST', { name: 'David Park', amountCents: 1500000, status: 'transferred', email: 'd@example.com' }),
      PARAMS_COLL,
    );
    expect(res.status).toBe(201);
    expect(mockSubDocSet).toHaveBeenCalledTimes(1);

    // Verify the persisted fields
    const [savedDoc] = mockSubDocSet.mock.calls[0];
    expect(savedDoc.name).toBe('David Park');
    expect(savedDoc.amountCents).toBe(1500000);
    expect(savedDoc.status).toBe('transferred');
    expect(savedDoc.email).toBe('d@example.com');
    expect(savedDoc.createdByUid).toBe(OWNER_UID);
  });

  it('post_201_defaults_status_pledged: omitting status defaults to pledged', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocSet.mockResolvedValueOnce(undefined);

    await POST(
      req('POST', { name: 'Investor X', amountCents: 500000 }),
      PARAMS_COLL,
    );
    const [savedDoc] = mockSubDocSet.mock.calls[0];
    expect(savedDoc.status).toBe('pledged');
  });

  it('post_attributes_to_creator: createdByUid is derived from token, not request body', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocSet.mockResolvedValueOnce(undefined);

    // Body tries to spoof a different uid — server must ignore it
    await POST(
      req('POST', { name: 'Alice', amountCents: 250000, createdByUid: 'SPOOFED_UID' }),
      PARAMS_COLL,
    );
    const [savedDoc] = mockSubDocSet.mock.calls[0];
    expect(savedDoc.createdByUid).toBe(OWNER_UID);
    expect(savedDoc.createdByUid).not.toBe('SPOOFED_UID');
  });

});

/* ══════════════════════════════════════════════════════════════════════════
   API — PATCH /api/projects/[id]/commitments/[cId]
   ══════════════════════════════════════════════════════════════════════════ */
function patchReq(body: object, token = 'valid-token') {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/commitments/${COMMIT_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/projects/[id]/commitments/[cId]', () => {

  it('patch_401_no_token: rejects unauthenticated request', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = await PATCH(patchReq({ status: 'cleared' }, 'bad'), PARAMS_DOC);
    expect(res.status).toBe(401);
  });

  it('patch_403_non_member: rejects non-member', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_uid' });
    mockProjectDocGet.mockResolvedValue(foreignProject());
    mockUserDocGet.mockResolvedValue(intruderUserDoc());

    const res = await PATCH(patchReq({ status: 'cleared' }), PARAMS_DOC);
    expect(res.status).toBe(403);
  });

  it('patch_404_missing_commitment: returns 404 when commitment doc does not exist', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: false });

    const res = await PATCH(patchReq({ status: 'cleared' }), PARAMS_DOC);
    expect(res.status).toBe(404);
  });

  it('patch_422_invalid_status: rejects unknown status string', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pledged' }) });

    const res = await PATCH(patchReq({ status: 'sent_to_moon' }), PARAMS_DOC);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/status/i);
  });

  it('patch_200_updates_status: persists the status cycle and returns 200', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pledged', amountCents: 100000 }) });
    mockSubDocUpdate.mockResolvedValueOnce(undefined);

    const res = await PATCH(patchReq({ status: 'cleared' }), PARAMS_DOC);
    expect(res.status).toBe(200);
    expect(mockSubDocUpdate).toHaveBeenCalledTimes(1);
    const [updatePayload] = mockSubDocUpdate.mock.calls[0];
    expect(updatePayload.status).toBe('cleared');
  });

  it('patch_persists_through_update: survives refresh (update writes to Firestore, not client state)', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pledged' }) });
    mockSubDocUpdate.mockResolvedValueOnce(undefined);

    await PATCH(patchReq({ amountCents: 750000 }), PARAMS_DOC);
    const [updatePayload] = mockSubDocUpdate.mock.calls[0];
    // The amount must be written to Firestore, not just returned to client
    expect(updatePayload.amountCents).toBe(750000);
    expect(mockSubDocUpdate).toHaveBeenCalledTimes(1);
  });

  it('patch_422_zero_amount: rejects zero amountCents in update', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: 'pledged' }) });

    const res = await PATCH(patchReq({ amountCents: 0 }), PARAMS_DOC);
    expect(res.status).toBe(422);
  });

});

/* ══════════════════════════════════════════════════════════════════════════
   API — DELETE /api/projects/[id]/commitments/[cId]
   ══════════════════════════════════════════════════════════════════════════ */
function deleteReq(token = 'valid-token') {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/commitments/${COMMIT_ID}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('DELETE /api/projects/[id]/commitments/[cId]', () => {

  it('delete_401_no_token: rejects unauthenticated request', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const res = await DELETE(deleteReq('bad'), PARAMS_DOC);
    expect(res.status).toBe(401);
  });

  it('delete_403_non_member: rejects non-member', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'intruder_uid' });
    mockProjectDocGet.mockResolvedValue(foreignProject());
    mockUserDocGet.mockResolvedValue(intruderUserDoc());

    const res = await DELETE(deleteReq(), PARAMS_DOC);
    expect(res.status).toBe(403);
  });

  it('delete_404_missing_commitment: returns 404 when commitment does not exist', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: false });

    const res = await DELETE(deleteReq(), PARAMS_DOC);
    expect(res.status).toBe(404);
  });

  it('delete_200_removes_commitment: calls Firestore delete and returns 200', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: OWNER_UID });
    mockProjectDocGet.mockResolvedValue(memberProject());
    mockUserDocGet.mockResolvedValue(ownerUserDoc());
    mockSubDocGet.mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Alice', amountCents: 1000000 }) });
    mockSubDocDelete.mockResolvedValueOnce(undefined);

    const res = await DELETE(deleteReq(), PARAMS_DOC);
    expect(res.status).toBe(200);
    expect(mockSubDocDelete).toHaveBeenCalledTimes(1);
  });

});
