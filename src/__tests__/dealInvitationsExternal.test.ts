import { inviteSubscribers } from '@/actions/dealInvitations';
import { adminDb } from '@/lib/firebase/admin';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockBatchSet = jest.fn();
var mockBatchCommit = jest.fn().mockResolvedValue(true);
var mockSendRawEmail = jest.fn().mockResolvedValue({ id: 'msg_123', mock: true });

var mockUserData = { role: 'Subscriber', email: 'test@subscriber.com' };
var mockListingData: any = {
  id: 'listing_123',
  projectId: 'proj_123',
  status: 'published',
  visibilityMode: 'PRIVATE',
  version: 1,
  askingPriceCents: 200000,
  propertyName: 'Capital Deal',
  address: '123 Main St, Miami, FL 33101',
  capRate: 8.5,
  cashOnCash: 10,
  equityTerms: {
    fundingTarget: 10000000, // $100k
    minTicket: 1000000,     // $10k
  },
  leadInvestor: { displayName: 'Marcus Aurelius' },
};
var mockProjectData: any = {
  id: 'proj_123',
  organizationId: 'org_123',
  ownerUid: 'user_lead_investor_seed',
  propertyName: 'Capital Deal',
  address: {
    street: '123 Main St',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
  },
};
var mockGlobalUnsubscribed = false;

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    },
    adminDb: {
      collection: jest.fn((colName) => ({
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(docRef, payload),
            collection: jest.fn((subCol) => {
              const chain: any = {
                doc: jest.fn((subDocId) => ({
                  id: subDocId,
                  path: `${colName}/${docId}/${subCol}/${subDocId}`,
                  set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                  update: (payload: any) => mockUpdate(subDocId, payload),
                })),
                where: jest.fn(() => chain),
                limit: jest.fn(() => chain),
                get: jest.fn().mockImplementation(() => {
                  return {
                    empty: true,
                    docs: [],
                    size: 0,
                    forEach: (cb: any) => [].forEach(cb),
                  };
                }),
                add: jest.fn().mockResolvedValue({ id: 'new-id' }),
              };
              return chain;
            }),
          };
          return {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              if (colName === 'unsubscribedEmails') {
                return {
                  exists: mockGlobalUnsubscribed,
                  data: () => ({ email: docId }),
                };
              }
              const res = await mockGet(colName, docId);
              return {
                exists: res ? res.exists : false,
                data: res ? res.data : () => undefined,
                ref: docRef,
              };
            },
            set: (...args: any[]) => mockSet(colName, docId, ...args),
            update: (payload: any) => mockUpdate(docRef, payload),
            collection: docRef.collection,
          };
        }),
        where: jest.fn(() => {
          const chain: any = {
            limit: jest.fn(() => chain),
            where: jest.fn(() => chain),
            get: jest.fn().mockImplementation(() => {
              if (colName === 'users') {
                return {
                  empty: false,
                  docs: [{ id: 'user_123', data: () => mockUserData }],
                };
              }
              if (colName === 'dealListings') {
                return {
                  empty: false,
                  docs: [{ id: 'listing_123', data: () => mockListingData }],
                };
              }
              return { empty: true, docs: [], size: 0 };
            }),
          };
          return chain;
        }),
      })),
      batch: jest.fn(() => ({
        set: (...args: any[]) => mockBatchSet(...args),
        update: (ref: any, payload: any) => mockUpdate(ref, payload),
        commit: () => mockBatchCommit(),
      })),
      runTransaction: jest.fn(),
    },
  };
});

jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    sendRawEmail: (...args: any[]) => mockSendRawEmail(...args),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn((name) => {
      if (name === 'mock_user_role') return { value: 'Lead Investor' };
      if (name === 'mock_user_email') return { value: 'marcus@apexcapital.io' };
      return null;
    }),
  })),
}));

jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: jest.fn().mockResolvedValue(true),
}));

describe('DM-25: External email invite & CAN-SPAM checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor_seed' });
    mockGlobalUnsubscribed = false;

    // Reset default mock objects
    mockListingData.visibilityMode = 'PRIVATE';
    mockListingData.status = 'published';

    mockGet.mockImplementation((colName, id) => {
      if (colName === 'projects') return { exists: true, data: () => mockProjectData };
      if (colName === 'dealListings') return { exists: true, data: () => mockListingData };
      return null;
    });
  });

  it('fails if target user is globally unsubscribed', async () => {
    mockGlobalUnsubscribed = true;

    await expect(
      inviteSubscribers('mock_token', 'proj_123', [{ email: 'optedout@example.com' }])
    ).rejects.toThrow('The email address optedout@example.com has opted out of platform invitations.');

    expect(mockSendRawEmail).not.toHaveBeenCalled();
  });

  it('sends exact details for PRIVATE visibility mode listings', async () => {
    mockListingData.visibilityMode = 'PRIVATE';

    const result = await inviteSubscribers('mock_token', 'proj_123', [
      { email: 'investor@example.com', name: 'Joe Investor' }
    ]);

    expect(result.success).toBe(true);
    expect(mockSendRawEmail).toHaveBeenCalledTimes(1);

    const [recipients, subject, html] = mockSendRawEmail.mock.calls[0];
    expect(recipients).toEqual(['investor@example.com']);
    expect(subject).toContain('Invitation to review Capital Deal');

    // Private must disclose exact details
    expect(html).toContain('123 Main St, Miami, FL 33101'); // Exact address
    expect(html).toContain('$2,000'); // Exact asking price ($200000 cents / 100)
    expect(html).toContain('8.5%');   // Exact cap rate
    expect(html).toContain('10%');    // Exact cash on cash
  });

  it('sends only approximate/obfuscated details for PUBLIC_SOLICITED listings', async () => {
    mockListingData.visibilityMode = 'PUBLIC_SOLICITED';
    mockListingData.neighborhood = 'Coconut Grove';
    mockListingData.city = 'Miami';
    mockListingData.state = 'FL';

    const result = await inviteSubscribers('mock_token', 'proj_123', [
      { email: 'investor@example.com', name: 'Joe Investor' }
    ]);

    expect(result.success).toBe(true);
    expect(mockSendRawEmail).toHaveBeenCalledTimes(1);

    const [recipients, subject, html] = mockSendRawEmail.mock.calls[0];
    expect(recipients).toEqual(['investor@example.com']);

    // Public must NOT disclose exact details, only teaser/obfuscated
    expect(html).not.toContain('123 Main St'); // No exact address
    expect(html).toContain('Coconut Grove, Miami, FL (Exact street address hidden)'); // Neighborhood location
    expect(html).toContain('~$2K');          // Obfuscated asking price (obfuscateApproximate of 200000 cents)
    expect(html).toContain('8–9%');            // Obfuscated cap rate range (obfuscateRange(8.5, 1))
    expect(html).toContain('10–12%');          // Obfuscated cash on cash range (obfuscateRange(10, 2))
  });

  it('incorporates required CAN-SPAM compliant headers/footer elements', async () => {
    const result = await inviteSubscribers('mock_token', 'proj_123', [
      { email: 'investor@example.com', name: 'Joe Investor' }
    ], 'Check this out!');

    expect(result.success).toBe(true);
    const [, , html] = mockSendRawEmail.mock.calls[0];

    // CAN-SPAM physical address of sender
    expect(html).toContain('PaperWorking Inc., 548 Market St, Suite 48921, San Francisco, CA 94104');
    
    // Unsubscribe link
    expect(html).toContain('/unsubscribe?email=investor%40example.com&projectId=proj_123');

    // Non-binding disclosure
    expect(html).toContain('Non-Binding Disclosure: This communication does not constitute an offer to sell or the solicitation of an offer to buy any securities. Any indication of interest or investment commitment made hereunder is non-binding.');

    // Unique invite token link
    expect(html).toContain('/invest/');
  });
});
