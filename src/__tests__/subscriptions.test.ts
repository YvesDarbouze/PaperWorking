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
var mockCollectionGroupGet = jest.fn();

// Mock Firestore ArrayUnion
var mockArrayUnion = jest.fn((...args) => args);

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collectionGroup: (_colName: string) => ({
      where: () => ({
        limit: () => ({
          get: (...args: any[]) => mockCollectionGroupGet(...args),
        }),
      }),
    }),
    collection: (_colName: string) => {
      if (_colName === 'users') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockUserDocGet(...args),
          }),
        };
      }
      // projects or other collections
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockSubDocGet(...args),
              set: (...args: any[]) => mockSubDocSet(...args),
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
    serverTimestamp: () => new Date('2026-07-19T00:00:00.000Z'),
    arrayUnion: (...args: any[]) => mockArrayUnion(...args),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes AFTER mocks are configured
   ────────────────────────────────────────────────────────────────────────── */
import { PATCH } from '@/app/api/projects/[id]/commitments/[cId]/route';
import { POST as webhookPOST } from '@/app/api/webhooks/docusign/route';

describe('Card F2.5 Subscriptions API & Webhook Tests', () => {
  const PROJECT_ID = 'proj_test_123';
  const OWNER_UID = 'user_lead_investor_seed';
  const COMMIT_ID = 'commit_xyz_789';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DOCUSIGN_WEBHOOK_HMAC_KEY = 'test_secret_key';

    // Mock project membership verification
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        organizationId: 'org_test_777',
        fractionalInvestors: [],
      }),
    });

    // Mock authenticated user
    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'owner@paperworking.co',
      name: 'Owner User',
    });
  });

  describe('PATCH /api/projects/[id]/commitments/[cId] (Status transitions)', () => {
    it('transitions to docs-out and initializes subscription agreement document', async () => {
      mockSubDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'soft-committed',
          name: 'Investor One',
          email: 'investor1@example.com',
          amountCents: 1000000,
        }),
      });
      mockSubDocGet.mockResolvedValueOnce({
        exists: false,
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/commitments/${COMMIT_ID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token',
          },
          body: JSON.stringify({ status: 'docs-out' }),
        }
      );

      const res = await PATCH(req, {
        params: Promise.resolve({ id: PROJECT_ID, cId: COMMIT_ID }),
      });

      expect(res.status).toBe(200);
      
      // Verify manual or auto subscription agreement creation check was done
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `sub_agreement_${COMMIT_ID}`,
          category: 'Other',
          fileName: 'Subscription_Agreement_Investor_One.pdf',
        })
      );

      // Verify transition log includes fromStatus: soft-committed and toStatus: docs-out
      expect(mockArrayUnion).toHaveBeenCalledWith(
        expect.objectContaining({
          fromStatus: 'soft-committed',
          toStatus: 'docs-out',
          actor: 'marcus@apexcapital.io',
        })
      );
    });

    it('transitions to funds-confirmed, writes a general ledger receipt, and updates cap table', async () => {
      mockSubDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'signed',
          name: 'Investor One',
          email: 'investor1@example.com',
          amountCents: 5000000, // $50,000
        }),
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/commitments/${COMMIT_ID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token',
          },
          body: JSON.stringify({ status: 'funds-confirmed', evidence: 'Wire #W9999' }),
        }
      );

      const res = await PATCH(req, {
        params: Promise.resolve({ id: PROJECT_ID, cId: COMMIT_ID }),
      });

      expect(res.status).toBe(200);

      // Verify a ledger item receipt is written under projects/{id}/ledgerItems
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'receipt',
          category: 'Other',
          description: 'Capital Contribution: Investor One',
          amount: 50000,
          status: 'Approved',
        })
      );

      // Verify project fractionalInvestors cap table is updated to status 'confirmed'
      expect(mockProjectDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fractionalInvestors: expect.arrayContaining([
            expect.objectContaining({
              id: COMMIT_ID,
              status: 'confirmed',
              contributionAmount: 50000,
            }),
          ]),
        })
      );
    });
  });

  describe('POST /api/webhooks/docusign (Connect Webhook)', () => {
    it('rejects requests with invalid signature', async () => {
      const payload = JSON.stringify({ status: 'completed' });
      const req = new NextRequest('http://localhost/api/webhooks/docusign', {
        method: 'POST',
        headers: {
          'X-DocuSign-Signature-1': 'invalid_signature_here',
        },
        body: payload,
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(401);
    });

    it('processes completed webhook, marking the matching commitment status as signed', async () => {
      const payloadObj = {
        envelopeId: 'env_docusign_abc_123',
        status: 'Completed',
        completedDateTime: '2026-07-19T02:00:00Z',
      };
      const payload = JSON.stringify(payloadObj);

      // Calculate correct HMAC signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(payload)
        .digest('base64');

      // Mock finding the envelope document in Firestore
      mockCollectionGroupGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            ref: {
              update: jest.fn().mockResolvedValue({}),
            },
            data: () => ({
              projectId: PROJECT_ID,
              documentId: `sub_agreement_${COMMIT_ID}`,
              envelopeId: 'env_docusign_abc_123',
            }),
          },
        ],
      });

      // Mock fetching current commitment data
      mockSubDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'docs-out',
          name: 'Investor One',
          email: 'investor1@example.com',
          amountCents: 1000000,
        }),
      });

      const req = new NextRequest('http://localhost/api/webhooks/docusign', {
        method: 'POST',
        headers: {
          'X-DocuSign-Signature-1': signature,
        },
        body: payload,
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(200);

      // Verify the commitment status is updated to 'signed'
      expect(mockSubDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'signed',
        })
      );
    });
  });
});
