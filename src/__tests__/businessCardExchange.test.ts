import { POST as respondRoute } from '@/app/api/invitations/respond/route';
import { GET as getInvitationRoute } from '@/app/api/invitations/[token]/route';
import { POST as exchangeRoute } from '@/app/api/projects/[id]/invitations/[invitationId]/exchange/route';
import { NextRequest } from 'next/server';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockAdd = jest.fn().mockResolvedValue({ id: 'new_doc_123' });
var mockIncr = jest.fn().mockResolvedValue(1);
var mockExpire = jest.fn().mockResolvedValue(true);
var mockTtl = jest.fn().mockResolvedValue(60);

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
  cardExchangeStatus: 'pending',
  inviteeBusinessCard: {
    name: 'Joe Investor',
    email: 'investor@example.com',
    phone: '555-1234',
    company: 'Capital Co',
  },
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
                where: jest.fn(() => chain),
                limit: jest.fn(() => chain),
                get: async () => {
                  const res = await mockGet(`${colName}/${docId}/${subCol}`);
                  const docs = Array.isArray(res) ? res.map((d: any) => ({
                    id: d.id || 'doc_id',
                    exists: true,
                    data: () => d,
                    ref: { id: d.id || 'doc_id', update: mockUpdate },
                  })) : [];
                  return { empty: docs.length === 0, docs };
                },
              };
              return chain;
            }),
          };
        }),
        where: jest.fn(() => {
          const chain: any = {
            where: jest.fn(() => chain),
            limit: jest.fn(() => chain),
            get: async () => {
              const res = await mockGet(colName);
              const docs = Array.isArray(res) ? res.map((d: any) => ({
                id: d.id || 'doc_id',
                exists: true,
                data: () => d,
                ref: { id: d.id || 'doc_id', update: mockUpdate },
              })) : [];
              return { empty: docs.length === 0, docs };
            },
          };
          return chain;
        }),
      })),
    },
  };
});

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: async (req: any) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader === 'Bearer invalid') {
      return { status: 401, error: 'Unauthorized' };
    }
    return { uid: 'user_lead_investor', token: { email: 'sponsor@example.com' } };
  },
  isAuthError: (auth: any) => !!auth.error,
}));

jest.mock('@/lib/redis', () => ({
  status: 'ready',
  incr: (...args: any[]) => mockIncr(...args),
  expire: (...args: any[]) => mockExpire(...args),
  ttl: (...args: any[]) => mockTtl(...args),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email_123' }),
    },
  })),
}));

describe('DM-28 Business Card Exchange Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIncr.mockResolvedValue(1);
    mockInvitationData.status = 'sent';
    mockInvitationData.cardExchangeStatus = 'pending';
    mockInvitationData.sponsorBusinessCard = undefined;
  });

  it('POST /api/invitations/respond sets cardExchangeStatus and saves invitee card on interested', async () => {
    mockGet.mockImplementation((colName) => {
      if (colName === 'dealInvitations') return [mockInvitationData];
      if (colName === 'projects') return mockProjectData;
      return null;
    });

    const body = {
      token: 'valid_token_1234567890',
      action: 'interested',
      disclosedCard: {
        name: 'Joe Investor',
        email: 'investor@example.com',
        phone: '555-1234',
        company: 'Capital Co',
      },
    };

    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'interested',
        cardExchangeStatus: 'pending',
        inviteeBusinessCard: body.disclosedCard,
      })
    );
  });

  it('GET /api/invitations/[token] hides sponsor business card details if cardExchangeStatus is not accepted', async () => {
    mockGet.mockImplementation((colName) => {
      if (colName === 'dealInvitations') return [mockInvitationData];
      if (colName === 'projects') return mockProjectData;
      return null;
    });

    const req = new NextRequest('http://localhost/api/invitations/valid_token_1234567890');
    const res = await getInvitationRoute(req, { params: Promise.resolve({ token: 'valid_token_1234567890' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cardExchangeStatus).toBe('pending');
    expect(data.sponsorBusinessCard).toBeNull();
  });

  it('GET /api/invitations/[token] releases sponsor business card details if cardExchangeStatus is accepted', async () => {
    const acceptedInvite = {
      ...mockInvitationData,
      status: 'interested',
      cardExchangeStatus: 'accepted',
      sponsorBusinessCard: {
        name: 'Marcus Aurelius',
        email: 'marcus@apexcapital.io',
        phone: '555-9999',
        company: 'Apex Capital',
        uid: 'user_lead_investor',
      },
    };

    mockGet.mockImplementation((colName) => {
      if (colName === 'dealInvitations') return [acceptedInvite];
      if (colName === 'projects') return mockProjectData;
      return null;
    });

    const req = new NextRequest('http://localhost/api/invitations/valid_token_1234567890');
    const res = await getInvitationRoute(req, { params: Promise.resolve({ token: 'valid_token_1234567890' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cardExchangeStatus).toBe('accepted');
    expect(data.sponsorBusinessCard).toEqual(acceptedInvite.sponsorBusinessCard);
  });

  it('POST /api/projects/[id]/invitations/[invitationId]/exchange accepts card exchange and publishes cards to projectFiles and contacts', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor' });
    const interestedInvite = {
      ...mockInvitationData,
      inviteeBusinessCard: {
        ...mockInvitationData.inviteeBusinessCard,
        uid: 'user_invitee_123',
      },
      status: 'interested',
      cardExchangeStatus: 'pending',
    };

    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects' && docId === 'proj_123') return mockProjectData;
      if (colName === 'dealInvitations' && docId === 'inv_123') return interestedInvite;
      if (colName === 'users' && docId === 'user_lead_investor') return { displayName: 'Marcus Aurelius', email: 'marcus@apexcapital.io' };
      if (colName === 'users' && docId === 'user_invitee_123') return { organizationId: 'org_invitee_123' };
      return null;
    });

    const body = {
      action: 'accept',
      disclosedCard: {
        name: 'Marcus Aurelius',
        email: 'marcus@apexcapital.io',
        phone: '555-9999',
        company: 'Apex Capital',
      },
    };

    const req = new NextRequest('http://localhost/api/projects/proj_123/invitations/inv_123/exchange', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_token',
      },
      body: JSON.stringify(body),
    });

    const res = await exchangeRoute(req, { params: Promise.resolve({ id: 'proj_123', invitationId: 'inv_123' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cardExchangeStatus: 'accepted',
        sponsorBusinessCard: expect.objectContaining({
          name: 'Marcus Aurelius',
          email: 'marcus@apexcapital.io',
        }),
      })
    );

    // Verifies files are written to projectFiles
    expect(mockSet).toHaveBeenCalledWith(
      'projectFiles',
      expect.any(String),
      expect.objectContaining({
        category: 'Business Card',
        projectId: 'proj_123',
        phase: 'phase-1',
      })
    );

    // Verifies card is written to responder's contacts fallback
    expect(mockSet).toHaveBeenCalledWith(
      'organizations/org_invitee_123/contacts',
      expect.any(String),
      expect.objectContaining({
        email: 'marcus@apexcapital.io',
        companyName: 'Apex Capital',
      })
    );
  });

  it('POST /api/projects/[id]/invitations/[invitationId]/exchange accepts card exchange and publishes cards to both projects when responder has a matching project', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor' });
    const interestedInvite = {
      ...mockInvitationData,
      inviteeBusinessCard: {
        ...mockInvitationData.inviteeBusinessCard,
        uid: 'user_invitee_123',
      },
      status: 'interested',
      cardExchangeStatus: 'pending',
    };

    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects') {
        if (docId === 'proj_123') return mockProjectData;
        if (!docId) {
          return [
            {
              id: 'proj_invitee_789',
              ownerUid: 'user_invitee_123',
              activeListingId: 'listing_123',
              organizationId: 'org_invitee_123',
              financials: {},
            }
          ];
        }
      }
      if (colName === 'dealInvitations' && docId === 'inv_123') return interestedInvite;
      if (colName === 'users' && docId === 'user_lead_investor') return { displayName: 'Marcus Aurelius', email: 'marcus@apexcapital.io' };
      return null;
    });

    const body = {
      action: 'accept',
      disclosedCard: {
        name: 'Marcus Aurelius',
        email: 'marcus@apexcapital.io',
        phone: '555-9999',
        company: 'Apex Capital',
      },
    };

    const req = new NextRequest('http://localhost/api/projects/proj_123/invitations/inv_123/exchange', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_token',
      },
      body: JSON.stringify(body),
    });

    const res = await exchangeRoute(req, { params: Promise.resolve({ id: 'proj_123', invitationId: 'inv_123' }) });
    expect(res.status).toBe(200);

    // Verifies Sponsor's card is written to responder's projectFiles
    expect(mockSet).toHaveBeenCalledWith(
      'projectFiles',
      expect.any(String),
      expect.objectContaining({
        category: 'Business Card',
        projectId: 'proj_invitee_789',
        phase: 'phase-1',
      })
    );
  });

  it('POST /api/projects/[id]/invitations/[invitationId]/exchange decline works silently', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor' });
    const interestedInvite = {
      ...mockInvitationData,
      status: 'interested',
      cardExchangeStatus: 'pending',
    };

    mockGet.mockImplementation((colName, docId) => {
      if (colName === 'projects' && docId === 'proj_123') return mockProjectData;
      if (colName === 'dealInvitations' && docId === 'inv_123') return interestedInvite;
      return null;
    });

    const body = {
      action: 'decline',
    };

    const req = new NextRequest('http://localhost/api/projects/proj_123/invitations/inv_123/exchange', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_token',
      },
      body: JSON.stringify(body),
    });

    const res = await exchangeRoute(req, { params: Promise.resolve({ id: 'proj_123', invitationId: 'inv_123' }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cardExchangeStatus: 'declined',
      })
    );
  });

  it('POST /api/invitations/respond rejects under rate limit', async () => {
    mockIncr.mockResolvedValue(999); // rate limit exceeded

    const body = {
      token: 'valid_token_1234567890',
      action: 'interested',
    };

    const req = new NextRequest('http://localhost/api/invitations/respond', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const res = await respondRoute(req);
    expect(res.status).toBe(429);
  });
});
