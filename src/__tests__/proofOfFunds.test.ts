/** @jest-environment node */
import { POST } from '../app/api/projects/[id]/proof-of-funds/route';
import { NextRequest } from 'next/server';

// ─── Setup Server-Side Mocks ──────────────────────────────────────
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(() => mockVerifyIdToken()),
  isAuthError: (auth: any) => auth && auth.status && auth.status !== 200,
}));

const mockProjectGet = jest.fn();
const mockProjectUpdate = jest.fn();
const mockUserGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation((colName) => {
      if (colName === 'projects') {
        return {
          doc: jest.fn().mockImplementation((id) => ({
            get: () => mockProjectGet(id),
            update: (...args: any[]) => mockProjectUpdate(...args),
          })),
        };
      }
      if (colName === 'users') {
        return {
          doc: jest.fn().mockImplementation((id) => ({
            get: () => mockUserGet(id),
          })),
        };
      }
      return {};
    }),
  },
}));

describe('Proof of Funds (PoF) API Endpoint & Verification Lifecycle', () => {
  const PROJECT_ID = 'project_pof_test';
  const OWNER_UID = 'user_lead_investor';
  const MEMBER_UID = 'user_co_buyer';

  const buildRequest = (body: Record<string, any>) =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/proof-of-funds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth resolve as Owner
    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'lead@paperworking.io',
      name: 'Lead Investor',
    });

    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        personalOrganizationId: 'org_test',
        name: 'Lead Investor',
      }),
    });

    mockProjectGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: PROJECT_ID,
        organizationId: 'org_test',
        ownerUid: OWNER_UID,
        completedFundCards: [],
        financials: {
          purchasePrice: 200000_00,
          capitalStack: [
            { id: 'source_1', category: 'Borrower Injection', amount: 50000_00 },
            { id: 'source_2', category: 'Co-buying Equity', amount: 30000_00 },
          ],
        },
        members: {
          [OWNER_UID]: { role: 'Lead Investor' },
          [MEMBER_UID]: { role: 'Co-buyer' },
        },
      }),
    });
  });

  it('should initialize the PoF checklist and process an upload action', async () => {
    const req = buildRequest({
      sourceId: 'source_1',
      action: 'upload',
      documentId: 'doc_123',
      documentName: 'proof.pdf',
      documentUrl: 'https://storage/proof.pdf',
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Should have populated the two sources
    expect(data.proofOfFunds.length).toBe(2);
    const source1 = data.proofOfFunds.find((p: any) => p.id === 'source_1');
    expect(source1.status).toBe('received');
    expect(source1.documentUrl).toBe('https://storage/proof.pdf');
    expect(source1.history.length).toBe(2); // init + upload logs

    expect(mockProjectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        proofOfFunds: expect.any(Array),
        completedFundCards: [], // source_2 is still requested, not verified, so F1.4 not completed
      })
    );
  });

  it('should deny verify action to non-Lead Investors', async () => {
    // Authenticate as normal co-buyer
    mockVerifyIdToken.mockResolvedValue({
      uid: MEMBER_UID,
      email: 'cobuyer@paperworking.io',
      name: 'Co-buyer',
    });

    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        personalOrganizationId: 'org_test',
        name: 'Co-buyer',
      }),
    });

    const req = buildRequest({
      sourceId: 'source_1',
      action: 'verify',
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  it('should allow Lead Investor to verify and automatically complete card F1.4 when all are verified', async () => {
    // Start with source_2 already verified, and source_1 received
    mockProjectGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: PROJECT_ID,
        organizationId: 'org_test',
        ownerUid: OWNER_UID,
        completedFundCards: [],
        proofOfFunds: [
          {
            id: 'source_1',
            sourceName: 'Borrower Injection',
            amount: 50000_00,
            status: 'received',
            documentId: 'doc_123',
            documentName: 'proof.pdf',
            documentUrl: 'https://storage/proof.pdf',
            history: [],
          },
          {
            id: 'source_2',
            sourceName: 'Co-buying Equity',
            amount: 30000_00,
            status: 'verified',
            verifiedByUid: OWNER_UID,
            verifiedAt: new Date().toISOString(),
            history: [],
          },
        ],
        financials: {
          purchasePrice: 200000_00,
          capitalStack: [
            { id: 'source_1', category: 'Borrower Injection', amount: 50000_00 },
            { id: 'source_2', category: 'Co-buying Equity', amount: 30000_00 },
          ],
        },
        members: {
          [OWNER_UID]: { role: 'Lead Investor' },
        },
      }),
    });

    const req = buildRequest({
      sourceId: 'source_1',
      action: 'verify',
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Since both source_1 and source_2 are verified now, completedFundCards must include 'F1.4'
    expect(data.completedFundCards).toContain('F1.4');
    expect(mockProjectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        completedFundCards: ['F1.4'],
      })
    );
  });

  it('should sync Plaid context balance correctly without affecting verification', async () => {
    const req = buildRequest({
      sourceId: 'source_1',
      action: 'plaid_sync',
      plaidAccountName: 'Plaid Check Balance',
      plaidBalance: 90000_00,
    });

    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    const pofItem = data.proofOfFunds.find((p: any) => p.id === 'source_1');
    expect(pofItem.plaidAccountName).toBe('Plaid Check Balance');
    expect(pofItem.plaidBalance).toBe(90000_00);
    expect(pofItem.status).toBe('requested'); // verification status remains unchanged
  });
});
