import { inboundEmailHandler, stripQuotedHistoryAndSignatures } from '@/lib/services/inboundEmailHandler';
import { POST as webhookRoute } from '@/app/api/webhooks/emails/route';
import { NextRequest } from 'next/server';

const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(true);
const mockUpdate = jest.fn().mockResolvedValue(true);
const mockAdd = jest.fn().mockResolvedValue({ id: 'new_doc_123' });
const mockWhereGet = jest.fn();

const mockInvitationData: any = {
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

const mockProjectData: any = {
  ownerUid: 'user_lead_investor',
  propertyName: '123 Main St',
  organizationId: 'org_123',
  activeListingId: 'listing_123',
};

jest.mock('@/lib/services/communicationService', () => ({
  communicationService: {
    logMessage: jest.fn().mockResolvedValue('msg_123'),
  },
}));

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminDb: {
      collection: jest.fn((colName) => ({
        add: (...args: any[]) => mockAdd(colName, ...args),
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(payload),
            set: (...args: any[]) => mockSet(colName, docId, ...args),
            collection: jest.fn((subCol) => ({
              doc: jest.fn((subDocId) => ({
                set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, subDocId, payload),
              })),
            })),
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
            collection: jest.fn((subCol) => {
              const chain: any = {
                add: (...args: any[]) => mockAdd(`${colName}/${docId}/${subCol}`, ...args),
                doc: jest.fn((subDocId) => {
                  const resolvedId = subDocId || `mock_sub_doc_${Math.random().toString(36).substring(7)}`;
                  const subRef = {
                    id: resolvedId,
                    path: `${colName}/${docId}/${subCol}/${resolvedId}`,
                    update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, resolvedId, payload),
                    set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, resolvedId, ...args),
                  };
                  return {
                    id: resolvedId,
                    path: `${colName}/${docId}/${subCol}/${resolvedId}`,
                    get: async () => {
                      const res = await mockGet(`${colName}/${docId}/${subCol}`, resolvedId);
                      return {
                        id: resolvedId,
                        exists: !!res,
                        data: () => res,
                        ref: subRef,
                      };
                    },
                    set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, resolvedId, ...args),
                    update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, resolvedId, payload),
                  };
                }),
                where: jest.fn(() => ({
                  get: async () => {
                    const docs = await mockWhereGet(`${colName}/${docId}/${subCol}`);
                    return {
                      empty: docs.length === 0,
                      docs: docs.map((d: any) => ({
                        id: d.id || 'doc_id',
                        data: () => d,
                        ref: {
                          id: d.id || 'doc_id',
                          update: (payload: any) => mockUpdate(`${colName}/${docId}/${subCol}`, d.id, payload),
                        },
                      })),
                    };
                  },
                })),
              };
              return chain;
            }),
          };
        }),
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: async () => {
              const docs = await mockWhereGet(colName);
              return {
                empty: docs.length === 0,
                docs: docs.map((d: any) => ({
                  id: d.id || 'doc_id',
                  data: () => d,
                  ref: {
                    id: d.id || 'doc_id',
                    update: (payload: any) => mockUpdate(colName, d.id, payload),
                  },
                })),
              };
            },
          })),
        })),
      })),
    },
  };
});

describe('stripQuotedHistoryAndSignatures', () => {
  it('should remove lines starting with >', () => {
    const text = 'This is the actual reply.\n> On Oct 1, 2026, John Doe wrote:\n> Hello world';
    expect(stripQuotedHistoryAndSignatures(text)).toBe('This is the actual reply.');
  });

  it('should truncate reply headers and standard signature indicators', () => {
    const text = 'Here is my response.\nOn Oct 1, 2026, at 10:00 AM, LeadInvestor <leadInvestor@domain.com> wrote:';
    expect(stripQuotedHistoryAndSignatures(text)).toBe('Here is my response.');

    const text2 = 'Thank you!\nRegards,\nJane Doe';
    expect(stripQuotedHistoryAndSignatures(text2)).toBe('Thank you!');

    const text3 = 'Let me check on that.\nSent from my iPhone';
    expect(stripQuotedHistoryAndSignatures(text3)).toBe('Let me check on that.');
  });
});

describe('Inbound Email Parser & Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'secret_webhook_token';
  });

  it('should reject webhook requests with invalid authorization', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong_secret',
      },
      body: JSON.stringify({}),
    });

    const response = await webhookRoute(request);
    expect(response.status).toBe(401);
  });

  it('should route email by token parsed from the To address', async () => {
    mockWhereGet.mockImplementation((col) => {
      if (col === 'dealInvitations') return [mockInvitationData];
      if (col === 'projects/proj_123/investorInquiries') return [];
      return [];
    });
    mockGet.mockImplementation((col, docId) => {
      if (col === 'projects') return mockProjectData;
      return null;
    });

    const payload = {
      To: 'PaperWorking <reply+valid_token_1234567890@inbound.paperworking.co>',
      From: 'investor@example.com',
      Subject: 'Re: Opportunity Review',
      TextBody: 'I am excited about this deal!\nRegards,\nJoe',
    };

    const res = await inboundEmailHandler.processInbound(payload);
    expect(res.success).toBe(true);
    expect(res.projectId).toBe('proj_123');

    // Verify stitching created a new inquiry thread
    expect(mockAdd).toHaveBeenCalledWith('projects/proj_123/investorInquiries', expect.objectContaining({
      projectId: 'proj_123',
      message: 'I am excited about this deal!',
      status: 'open',
    }));

    // Verify ledger entry for disclosure
    expect(mockSet).toHaveBeenCalledWith('projects/proj_123/dealLedger', expect.any(String), expect.objectContaining({
      eventType: 'INVITATION_RESPONSE',
      metadata: expect.objectContaining({
        status: 'question',
        question: 'I am excited about this deal!',
      }),
    }));
  });

  it('should stitch email into an existing Q&A thread', async () => {
    mockWhereGet.mockImplementation((col) => {
      if (col === 'dealInvitations') return [mockInvitationData];
      if (col === 'projects/proj_123/investorInquiries') {
        return [{ id: 'inq_123', invitationId: 'inv_123', messages: [] }];
      }
      return [];
    });
    mockGet.mockImplementation((col, docId) => {
      if (col === 'projects') return mockProjectData;
      return null;
    });

    const payload = {
      To: 'reply+valid_token_1234567890@inbound.paperworking.co',
      From: 'investor@example.com',
      Subject: 'Re: Opportunity Review',
      TextBody: 'Another question about exit terms.',
    };

    const res = await inboundEmailHandler.processInbound(payload);
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith('projects/proj_123/investorInquiries', 'inq_123', expect.any(Object));
  });

  it('should reject processing if the invitation is expired', async () => {
    const expiredInvitation = {
      ...mockInvitationData,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
    };

    mockWhereGet.mockImplementation((col) => {
      if (col === 'dealInvitations') return [expiredInvitation];
      return [];
    });

    const payload = {
      To: 'reply+valid_token_1234567890@inbound.paperworking.co',
      From: 'investor@example.com',
      Subject: 'Re: Opportunity Review',
      TextBody: 'Hello',
    };

    const res = await inboundEmailHandler.processInbound(payload);
    expect(res.success).toBe(false);
    expect(res.reason).toBe('link_expired');
  });
});
