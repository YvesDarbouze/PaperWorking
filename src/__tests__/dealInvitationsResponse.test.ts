import { POST as respondRoute } from '@/app/api/invitations/respond/route';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockDelete = jest.fn().mockResolvedValue(true);
var mockAdd = jest.fn().mockResolvedValue({ id: 'new_doc_123' });

var mockInvitationData: any = {
  id: 'inv_123',
  token: 'valid_token_1234567890',
  inviteeEmail: 'investor@example.com',
  inviteeName: 'Joe Investor',
  projectId: 'proj_123',
  inviterUid: 'user_lead_investor',
  status: 'sent',
  version: 1,
  visibilityMode: 'PRIVATE',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
};

var mockCommitmentData: any = null;

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    },
    adminDb: {
      collection: jest.fn((colName) => ({
        add: (...args: any[]) => mockAdd(colName, ...args),
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(payload),
            delete: () => mockDelete(),
          };
          return {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                exists: !!res,
                data: () => res,
                ref: docRef,
              };
            },
            set: (...args: any[]) => mockSet(colName, docId, ...args),
            update: (payload: any) => mockUpdate(payload),
            delete: () => mockDelete(),
            collection: jest.fn((subCol) => {
              const chain: any = {
                add: (...args: any[]) => mockAdd(`${colName}/${docId}/${subCol}`, ...args),
                doc: jest.fn((subDocId) => ({
                  id: subDocId,
                  set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                  delete: () => mockDelete(),
                })),
                where: jest.fn((field, op, val) => {
                  const subChain: any = {
                    get: jest.fn().mockImplementation(() => {
                      if (subCol === 'commitments' && field === 'email' && val === 'investor@example.com') {
                        if (mockCommitmentData) {
                          return {
                            empty: false,
                            docs: [{ ref: { id: 'commit_123', delete: mockDelete }, data: () => mockCommitmentData }],
                          };
                        }
                      }
                      return { empty: true, docs: [], size: 0 };
                    }),
                  };
                  return subChain;
                }),
              };
              return chain;
            }),
          };
        }),
        where: jest.fn((field, op, val) => {
          const chain: any = {
            limit: jest.fn(() => chain),
            get: jest.fn().mockImplementation(() => {
              if (colName === 'dealInvitations' && field === 'token' && val === 'valid_token_1234567890') {
                return {
                  empty: false,
                  docs: [{ ref: { id: 'inv_123', update: mockUpdate }, data: () => mockInvitationData }],
                };
              }
              return { empty: true, docs: [], size: 0 };
            }),
          };
          return chain;
        }),
      })),
    },
  };
});

jest.mock('@/lib/firebase/syncFractionalInvestors', () => ({
  syncFractionalInvestorFromCommitment: jest.fn().mockResolvedValue(true),
  removeFractionalInvestorForCommitment: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/firebase/orgActivityWriter', () => ({
  logOrgActivity: jest.fn().mockResolvedValue(true),
}));

describe('POST /api/invitations/respond', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvitationData.status = 'sent';
    mockInvitationData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockCommitmentData = null;
  });

  it('declines invitation successfully and records reason', async () => {
    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_1234567890',
        action: 'decline',
        declineReason: 'Too expensive',
      }),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify invitation updated to declined
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'declined',
        declineReason: 'Too expensive',
      })
    );
  });

  it('registers interest successfully', async () => {
    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_1234567890',
        action: 'interested',
      }),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify status updated to interested
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'interested',
      })
    );
  });

  it('reopens invitation and tears down pledged commitments', async () => {
    mockInvitationData.status = 'interested';
    mockCommitmentData = {
      status: 'pledged',
      email: 'investor@example.com',
      amountCents: 5000000,
    };

    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_1234567890',
        action: 'reopen',
      }),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify status updated back to opened/pending
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'opened',
      })
    );

    // Verify pledged commitment was deleted/torn down
    expect(mockDelete).toHaveBeenCalled();
  });

  it('blocks reversing when commitment has been signed/confirmed', async () => {
    mockInvitationData.status = 'accepted';
    mockCommitmentData = {
      status: 'signed',
      email: 'investor@example.com',
      amountCents: 5000000,
    };

    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid_token_1234567890',
        action: 'reopen',
      }),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toContain('Cannot change response: The Lead Investor has already acted on this commitment.');

    // Verify no updates happened
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
