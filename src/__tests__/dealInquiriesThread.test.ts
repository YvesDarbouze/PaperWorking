import { GET as getInvitationRoute } from '@/app/api/invitations/[token]/route';
import { POST as askRoute } from '@/app/api/invitations/[token]/ask/route';
import { POST as replyRoute } from '@/app/api/projects/[id]/inquiries/[inquiryId]/reply/route';
import { PATCH as updateInquiryRoute } from '@/app/api/projects/[id]/inquiries/[inquiryId]/route';
import { NextRequest } from 'next/server';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockDelete = jest.fn().mockResolvedValue(true);
var mockAdd = jest.fn().mockResolvedValue({ id: 'new_doc_123' });
var mockCommit = jest.fn().mockResolvedValue(true);

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
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

var mockProjectData: any = {
  ownerUid: 'user_lead_investor',
  propertyName: '123 Main St',
  activeListingId: 'listing_123',
  version: 1,
  visibilityMode: 'PRIVATE',
  financials: {
    capitalRaiseTarget: 50000000,
  },
};

var mockInquiries: any[] = [];

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    },
    adminDb: {
      batch: () => ({
        update: mockUpdate,
        set: mockSet,
        commit: mockCommit,
      }),
      collection: jest.fn((colName) => ({
        add: (...args: any[]) => mockAdd(colName, ...args),
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(payload),
            delete: () => mockDelete(),
            set: (...args: any[]) => mockSet(colName, docId, ...args),
          };
          return {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                id: docId,
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
                doc: jest.fn((subDocId) => {
                  const subRef = {
                    id: subDocId,
                    path: `${colName}/${docId}/${subCol}/${subDocId}`,
                    update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, subDocId, payload),
                    set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                  };
                  return {
                    id: subDocId,
                    path: `${colName}/${docId}/${subCol}/${subDocId}`,
                    get: async () => {
                      const res = await mockGet(`${colName}/${docId}/${subCol}`, subDocId);
                      return {
                        id: subDocId,
                        exists: !!res,
                        data: () => res,
                        ref: subRef,
                      };
                    },
                    set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                    update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, subDocId, payload),
                  };
                }),
                where: jest.fn((field, op, val) => {
                  const subChain: any = {
                    limit: jest.fn(() => subChain),
                    get: jest.fn().mockImplementation(() => {
                      if (subCol === 'commitments') {
                        return { empty: true, docs: [], size: 0 };
                      }
                      if (subCol === 'investorInquiries' && field === 'invitationId') {
                        const match = mockInquiries.filter((i) => i.invitationId === val);
                        return {
                          empty: match.length === 0,
                          docs: match.map((m) => ({
                            id: m.id,
                            ref: {
                              id: m.id,
                              update: (p: any) => mockUpdate(`${colName}/${docId}/${subCol}`, m.id, p),
                            },
                            data: () => m,
                          })),
                          size: match.length,
                        };
                      }
                      return { empty: true, docs: [], size: 0 };
                    }),
                  };
                  return subChain;
                }),
                get: jest.fn().mockImplementation(() => {
                  if (subCol === 'investorInquiries') {
                    return {
                      empty: mockInquiries.length === 0,
                      docs: mockInquiries.map((m) => ({
                        id: m.id,
                        ref: {
                          id: m.id,
                          update: (p: any) => mockUpdate(`${colName}/${docId}/${subCol}`, m.id, p),
                        },
                        data: () => m,
                      })),
                      size: mockInquiries.length,
                    };
                  }
                  return { empty: true, docs: [], size: 0 };
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
                  docs: [{ id: 'inv_123', ref: { id: 'inv_123' }, data: () => mockInvitationData }],
                };
              }
              if (colName === 'dealInvitations' && field === 'token' && val === 'expired_token_12345') {
                const expData = { ...mockInvitationData, expiresAt: new Date(Date.now() - 1000).toISOString() };
                return {
                  empty: false,
                  docs: [{ id: 'inv_expired', ref: { id: 'inv_expired' }, data: () => expData }],
                };
              }
              return { empty: true, docs: [], size: 0 };
            }),
          };
          return chain;
        }),
      })),
    },
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
      arrayUnion: (item: any) => [item],
    },
  };
});

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: async (req: any) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader === 'Bearer invalid') {
      return { status: 401, error: 'Unauthorized' };
    }
    return { uid: 'user_lead_investor', token: { email: 'leadInvestor@example.com' } };
  },
  isAuthError: (auth: any) => !!auth.error,
}));

jest.mock('@/lib/reporting/propertyMetricHistory', () => ({
  fetchPropertyMetricHistory: async () => ({ noiHistory: [], capRateHistory: [], cashFlowHistory: [] }),
  computeRaiseProgress: async () => ({ raiseRaised: 0, raisePercentage: 0 }),
  computeRaiseCountdown: () => ({ daysLeft: 30, hoursLeft: 12 }),
}));

describe('DM-27 Question Threads Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInquiries = [];
    mockVerifyIdToken.mockReset();
    mockGet.mockReset();
    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects' && docId === 'proj_123') return mockProjectData;
      if (colName === 'dealInvitations' && docId === 'inv_123') return mockInvitationData;
      return null;
    });
  });

  it('GET /api/invitations/[token] returns own and anonymized shared inquiries', async () => {
    // Populate mockInquiries
    mockInquiries = [
      {
        id: 'inq_own',
        projectId: 'proj_123',
        invitationId: 'inv_123',
        investorName: 'Joe Investor',
        investorEmail: 'investor@example.com',
        status: 'open',
        isShared: false,
        messages: [{ id: 'm1', sender: 'investor', text: 'Own question', createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inq_other_shared',
        projectId: 'proj_123',
        invitationId: 'inv_other',
        investorName: 'Other Investor',
        investorEmail: 'other@example.com',
        status: 'answered',
        isShared: true,
        messages: [{ id: 'm2', sender: 'investor', text: 'Shared question', createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inq_other_private',
        projectId: 'proj_123',
        invitationId: 'inv_private',
        investorName: 'Private Investor',
        investorEmail: 'private@example.com',
        status: 'open',
        isShared: false,
        messages: [{ id: 'm3', sender: 'investor', text: 'Private question', createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const req = new NextRequest('http://localhost/api/invitations/valid_token_1234567890');
    const res = await getInvitationRoute(req, { params: Promise.resolve({ token: 'valid_token_1234567890' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.inquiries).toBeDefined();
    expect(body.inquiries.length).toBe(2); // Own thread + other shared thread

    // Own thread is unmodified
    const own = body.inquiries.find((i: any) => i.id === 'inq_own');
    expect(own.investorName).toBe('Joe Investor');
    expect(own.investorEmail).toBe('investor@example.com');
    expect(own.isOwn).toBe(true);

    // Shared thread has identity details scrubbed
    const shared = body.inquiries.find((i: any) => i.id === 'inq_other_shared');
    expect(shared.investorName).toBe('Anonymous Investor');
    expect(shared.investorEmail).toBeNull();
    expect(shared.isOwn).toBe(false);
  });

  it('POST /api/invitations/[token]/ask appends to existing thread', async () => {
    mockInquiries = [
      {
        id: 'inq_own',
        projectId: 'proj_123',
        invitationId: 'inv_123',
        investorName: 'Joe Investor',
        investorEmail: 'investor@example.com',
        status: 'open',
        isShared: false,
        messages: [{ id: 'm1', sender: 'investor', text: 'First question', createdAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const req = new NextRequest('http://localhost/api/invitations/valid_token_1234567890/ask', {
      method: 'POST',
      body: JSON.stringify({ message: 'Second question' }),
    });

    const res = await askRoute(req, { params: Promise.resolve({ token: 'valid_token_1234567890' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('POST /api/invitations/[token]/ask creates new thread if none exists', async () => {
    mockInquiries = [];

    const req = new NextRequest('http://localhost/api/invitations/valid_token_1234567890/ask', {
      method: 'POST',
      body: JSON.stringify({ message: 'Brand new question' }),
    });

    const res = await askRoute(req, { params: Promise.resolve({ token: 'valid_token_1234567890' }) });
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith('projects/proj_123/investorInquiries', expect.any(Object));
  });

  it('POST /api/projects/[id]/inquiries/[inquiryId]/reply appends leadInvestor response', async () => {
    const thread = {
      id: 'inq_123',
      projectId: 'proj_123',
      invitationId: 'inv_123',
      investorName: 'Joe Investor',
      investorEmail: 'investor@example.com',
      status: 'open',
      isShared: false,
      messages: [{ id: 'm1', sender: 'investor', text: 'LeadInvestor question', createdAt: new Date().toISOString() }],
    };
    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects' && docId === 'proj_123') return mockProjectData;
      if (colName === 'projects/proj_123/investorInquiries' && docId === 'inq_123') return thread;
      if (colName === 'dealInvitations' && docId === 'inv_123') return mockInvitationData;
      return null;
    });

    const req = new NextRequest('http://localhost/api/projects/proj_123/inquiries/inq_123/reply', {
      method: 'POST',
      headers: { authorization: 'Bearer leadInvestor_token' },
      body: JSON.stringify({ text: 'This is the answer' }),
    });

    const res = await replyRoute(req, { params: Promise.resolve({ id: 'proj_123', inquiryId: 'inq_123' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('projects/proj_123/investorInquiries', 'inq_123', expect.any(Object));
  });

  it('PATCH /api/projects/[id]/inquiries/[inquiryId] toggles isShared and writes anonymized ledger event', async () => {
    const thread = {
      id: 'inq_123',
      projectId: 'proj_123',
      invitationId: 'inv_123',
      investorName: 'Joe Investor',
      investorEmail: 'investor@example.com',
      status: 'answered',
      isShared: false,
      messages: [
        { id: 'm1', sender: 'investor', text: 'The Question', createdAt: new Date().toISOString() },
        { id: 'm2', sender: 'leadInvestor', text: 'The Answer', createdAt: new Date().toISOString() },
      ],
    };
    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects' && docId === 'proj_123') return mockProjectData;
      if (colName === 'projects/proj_123/investorInquiries' && docId === 'inq_123') return thread;
      return null;
    });

    const req = new NextRequest('http://localhost/api/projects/proj_123/inquiries/inq_123', {
      method: 'PATCH',
      headers: { authorization: 'Bearer leadInvestor_token' },
      body: JSON.stringify({ isShared: true }),
    });

    const res = await updateInquiryRoute(req, { params: Promise.resolve({ id: 'proj_123', inquiryId: 'inq_123' }) });
    expect(res.status).toBe(200);

    // Verify ledger write inside transaction/batch
    expect(mockSet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        eventType: 'QNA_SHARED',
        metadata: {
          inquiryId: 'inq_123',
          question: 'The Question',
          answer: 'The Answer',
        },
      })
    );
  });

  it('Rejects requests on expired invitations', async () => {
    const req = new NextRequest('http://localhost/api/invitations/expired_token_12345/ask', {
      method: 'POST',
      body: JSON.stringify({ message: 'Too late question' }),
    });

    const res = await askRoute(req, { params: Promise.resolve({ token: 'expired_token_12345' }) });
    expect(res.status).toBe(410);
  });
});
