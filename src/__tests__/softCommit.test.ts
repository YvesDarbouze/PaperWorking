// Set environment variables before any file imports to ensure module-level initialization detects them.
process.env.RESEND_API_KEY = 'mock-key';

import { POST as saveIndication, DELETE as withdrawIndication } from '@/app/api/invitations/[token]/indication/route';
import { NextRequest } from 'next/server';

// ─── Setup Mocks ───────────────────────────────────────
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockSendEmail = jest.fn().mockResolvedValue({ id: 'email-123' });

// Mock Resend SDK
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: (...args: any[]) => mockSendEmail(...args),
      },
    })),
  };
});

// Mock timeline activity
jest.mock('@/lib/invitations/activityTimeline', () => ({
  trackDealActivity: jest.fn().mockResolvedValue('new-timeline-id'),
}));

// Mock firebase admin DB
var mockInvitationDocs: any[] = [];
var mockProjectDocs: any[] = [];
var mockUserDocs: any[] = [];

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn((colName) => {
      const colChain: any = {
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId || 'mock-id',
            path: `${colName}/${docId}`,
            update: (payload: any) => {
              if (colName === 'dealInvitations' || colName === 'invitations') {
                const found = mockInvitationDocs.find((i) => i.id === docId);
                if (found) Object.assign(found, payload);
              }
              return mockUpdate(docRef, payload);
            },
          };

          const docObj: any = {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              if (colName === 'users') {
                const found = mockUserDocs.find((u) => u.id === docId);
                return { exists: !!found, data: () => found, ref: docRef };
              }
              if (colName === 'projects') {
                const found = mockProjectDocs.find((p) => p.id === docId);
                return { exists: !!found, data: () => found, ref: docRef };
              }
              const res = await mockGet(colName, docId);
              return { exists: !!res, data: () => res, ref: docRef };
            },
            update: (payload: any) => docRef.update(payload),
          };
          return docObj;
        }),
        where: jest.fn((field, op, val) => {
          const filterChain: any = {
            limit: jest.fn(() => filterChain),
            get: async () => {
              let filtered = [];
              if (colName === 'invitations' || colName === 'dealInvitations') {
                filtered = mockInvitationDocs.filter((item) => item[field] === val);
              }
              return {
                empty: filtered.length === 0,
                docs: filtered.map((item) => ({
                  id: item.id,
                  data: () => item,
                  ref: {
                    id: item.id,
                    update: (payload: any) => {
                      Object.assign(item, payload);
                      return mockUpdate(item, payload);
                    },
                  },
                })),
              };
            },
          };
          return filterChain;
        }),
      };
      return colChain;
    }),
  },
}));

describe('DM-33: Soft-Commit / Indication of Interest Capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvitationDocs = [];
    mockProjectDocs = [];
    mockUserDocs = [];
  });

  const mockInvite = {
    id: 'inv-123',
    token: 'token-abc-123456789',
    projectId: 'proj-123',
    invitedByUid: 'leadInvestor-123',
    inviteeName: 'LP Test',
    inviteeEmail: 'lp@test.com',
    email: 'lp@test.com',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    status: 'pending',
  };

  const mockProject = {
    id: 'proj-123',
    propertyName: 'Sunnyvale Commons',
    ownerUid: 'leadInvestor-123',
  };

  const mockLeadInvestor = {
    id: 'leadInvestor-123',
    email: 'leadInvestor@test.com',
  };

  it('saves a percentage soft-commit and notifies Lead Investor', async () => {
    mockInvitationDocs.push(mockInvite);
    mockProjectDocs.push(mockProject);
    mockUserDocs.push(mockLeadInvestor);

    const request = new NextRequest('http://localhost:3000/api/invitations/token-abc-123456789/indication', {
      method: 'POST',
      body: JSON.stringify({
        type: 'percentage',
        value: 5,
      }),
    });

    const response = await saveIndication(request, { params: Promise.resolve({ token: 'token-abc-123456789' }) });
    expect(response.status).toBe(200);

    const updatedInvite = mockInvitationDocs[0];
    expect(updatedInvite.indication).toBeDefined();
    expect(updatedInvite.indication.type).toBe('percentage');
    expect(updatedInvite.indication.value).toBe(5);

    // Email verification
    expect(mockSendEmail).toHaveBeenCalled();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.to).toContain('leadInvestor@test.com');
    expect(emailArgs.subject).toContain('[Soft Commit] Indication of Interest update');
    expect(emailArgs.html).toContain('5%');

    // Rule 10 check: email content must avoid prohibited words
    const bannedWords = ['pledge', 'commitment', 'subscription', 'reservation', 'allocation'];
    const emailTextLower = emailArgs.html.toLowerCase();
    // Exclude the legal disclaimer explaining it is NOT those things
    const mainBody = emailTextLower.split('* note:')[0];
    for (const word of bannedWords) {
      expect(mainBody).not.toContain(`<strong>${word}</strong>`);
      expect(mainBody).not.toContain(` ${word} `);
    }
  });

  it('saves an amount soft-commit with ISO-4217 currency and notifies Lead Investor', async () => {
    mockInvitationDocs.push(mockInvite);
    mockProjectDocs.push(mockProject);
    mockUserDocs.push(mockLeadInvestor);

    const request = new NextRequest('http://localhost:3000/api/invitations/token-abc-123456789/indication', {
      method: 'POST',
      body: JSON.stringify({
        type: 'amount',
        value: 50000,
        currency: 'EUR',
      }),
    });

    const response = await saveIndication(request, { params: Promise.resolve({ token: 'token-abc-123456789' }) });
    expect(response.status).toBe(200);

    const updatedInvite = mockInvitationDocs[0];
    expect(updatedInvite.indication.type).toBe('amount');
    expect(updatedInvite.indication.value).toBe(50000);
    expect(updatedInvite.indication.currency).toBe('EUR');

    expect(mockSendEmail).toHaveBeenCalled();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.html).toContain('EUR 50,000');
  });

  it('rejects invalid inputs on indication save', async () => {
    mockInvitationDocs.push(mockInvite);

    // Invalid percentage > 100
    const request1 = new NextRequest('http://localhost:3000/api/invitations/token-abc-123456789/indication', {
      method: 'POST',
      body: JSON.stringify({
        type: 'percentage',
        value: 120,
      }),
    });
    const res1 = await saveIndication(request1, { params: Promise.resolve({ token: 'token-abc-123456789' }) });
    expect(res1.status).toBe(400);

    // Missing currency code on amount type
    const request2 = new NextRequest('http://localhost:3000/api/invitations/token-abc-123456789/indication', {
      method: 'POST',
      body: JSON.stringify({
        type: 'amount',
        value: 25000,
      }),
    });
    const res2 = await saveIndication(request2, { params: Promise.resolve({ token: 'token-abc-123456789' }) });
    expect(res2.status).toBe(400);
  });

  it('withdraws indication and notifies Lead Investor', async () => {
    const inviteWithIndication = {
      ...mockInvite,
      indication: {
        type: 'amount',
        value: 100000,
        currency: 'USD',
      },
    };
    mockInvitationDocs.push(inviteWithIndication);
    mockProjectDocs.push(mockProject);
    mockUserDocs.push(mockLeadInvestor);

    const request = new NextRequest('http://localhost:3000/api/invitations/token-abc-123456789/indication', {
      method: 'DELETE',
    });

    const response = await withdrawIndication(request, { params: Promise.resolve({ token: 'token-abc-123456789' }) });
    expect(response.status).toBe(200);

    const updatedInvite = mockInvitationDocs[0];
    expect(updatedInvite.indication).toBeNull();

    expect(mockSendEmail).toHaveBeenCalled();
    const emailArgs = mockSendEmail.mock.calls[0][0];
    expect(emailArgs.subject).toContain('withdrawn');
    expect(emailArgs.html).toContain('withdrawn their non-binding indication of interest');
  });
});
