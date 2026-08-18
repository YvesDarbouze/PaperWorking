import { submitTakedownReport, resolveTakedownReport } from '@/actions/takedown';
import { getPublicListing, getSubscriberListing } from '@/actions/listings';

// Mock DB state
let mockListings: Record<string, any> = {};
let mockProjects: Record<string, any> = {};
let mockTickets: Record<string, any> = {};
let mockLedgerEntries: Record<string, any[]> = {};
let mockUsers: Record<string, any> = {};

const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: async (idToken: string) => {
      if (idToken === 'token_admin') return { uid: 'user_admin' };
      if (idToken === 'token_subscriber_other') return { uid: 'user_other' };
      if (idToken === 'token_lead_investor') return { uid: 'user_lead_investor' };
      throw new Error('Invalid token');
    },
  },
  adminDb: {
    collection: jest.fn((colName) => ({
      doc: jest.fn((docId = 'temp_id') => ({
        id: docId,
        get: async () => {
          let data = null;
          if (colName === 'dealListings') data = mockListings[docId];
          if (colName === 'projects') data = mockProjects[docId];
          if (colName === 'support_tickets') data = mockTickets[docId];
          if (colName === 'users') data = mockUsers[docId];
          return {
            exists: !!data,
            data: () => data,
            id: docId,
            ref: {
              update: async (updates: any) => {
                if (colName === 'dealListings' && mockListings[docId]) {
                  mockListings[docId] = { ...mockListings[docId], ...updates };
                }
              },
            },
          };
        },
        set: async (val: any) => {
          if (colName === 'support_tickets') mockTickets[docId] = val;
        },
        update: async (val: any) => {
          if (colName === 'dealListings' && mockListings[docId]) {
            mockListings[docId] = { ...mockListings[docId], ...val };
          }
          if (colName === 'support_tickets' && mockTickets[docId]) {
            mockTickets[docId] = { ...mockTickets[docId], ...val };
          }
        },
        collection: jest.fn((subCol) => ({
          doc: jest.fn((ledgerId = 'ledger_id') => ({
            id: ledgerId,
            set: async (val: any) => {
              if (!mockLedgerEntries[docId]) mockLedgerEntries[docId] = [];
              mockLedgerEntries[docId].push(val);
            },
          })),
        })),
      })),
      where: jest.fn(() => ({
        get: async () => ({ empty: true, docs: [] }),
      })),
    })),
    batch: jest.fn(() => ({
      update: mockBatchUpdate,
      set: mockBatchSet,
      commit: mockBatchCommit,
    })),
  },
}));

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'mock_user_role') return { value: 'Investor' };
      if (name === 'mock_user_account_type') return { value: 'investor' };
      return null;
    },
  }),
}));

describe('DM-42: Homeowner and Third-Party Takedown', () => {
  beforeEach(() => {
    mockListings = {
      listing_123: {
        id: 'listing_123',
        projectId: 'project_456',
        ownerUid: 'user_lead_investor',
        propertyName: 'Sunset Heights',
        address: '100 Sunset Blvd',
        neighborhood: 'Sunset',
        status: 'published',
        visibilityMode: 'PUBLIC_SOLICITED',
        viewCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockProjects = {
      project_456: {
        id: 'project_456',
        propertyName: 'Sunset Heights',
        address: '100 Sunset Blvd',
        status: 'acquisition',
        ownerUid: 'user_lead_investor',
        members: {},
      },
    };
    mockUsers = {
      user_admin: {
        uid: 'user_admin',
        role: 'Admin',
        accountType: 'investor',
        subscriptionPlan: 'Team',
        subscriptionStatus: 'active',
      },
      user_other: {
        uid: 'user_other',
        role: 'Investor',
        accountType: 'investor',
        subscriptionPlan: 'Team',
        subscriptionStatus: 'active',
      },
      user_lead_investor: {
        uid: 'user_lead_investor',
        role: 'Lead Investor',
        accountType: 'investor',
        subscriptionPlan: 'Team',
        subscriptionStatus: 'active',
      },
    };
    mockTickets = {};
    mockLedgerEntries = {};

    jest.clearAllMocks();
    mockBatchUpdate.mockReset();
    mockBatchSet.mockReset();
    mockBatchCommit.mockReset();
  });

  it('submits a report, moves listing to takedown_review, and writes TAKEDOWN_REVIEW_STARTED ledger entry', async () => {
    const report = {
      reporterName: 'Jane Doe',
      reporterEmail: 'jane@doe.com',
      relationship: 'owner',
      listingId: 'listing_123',
      propertyAddress: '100 Sunset Blvd',
      reason: 'unauthorized',
      details: 'This is my home, I did not authorize this listing.',
    };

    const res = await submitTakedownReport(report);
    expect(res.success).toBe(true);
    expect(res.ticketId).toBeDefined();

    // Verify interim state: public visibility is suspended (status is takedown_review)
    expect(mockListings.listing_123.status).toBe('takedown_review');

    // Verify ticket in operator queue
    const ticket = mockTickets[res.ticketId];
    expect(ticket).toBeDefined();
    expect(ticket.category).toBe('Property Takedown');
    expect(ticket.priority).toBe('high');
    expect(ticket.status).toBe('open');
    expect(ticket.responseSla).toBeDefined(); // SLA present

    // Verify ledger entry
    const entries = mockLedgerEntries.project_456;
    expect(entries).toBeDefined();
    expect(entries.length).toBe(1);
    expect(entries[0].eventType).toBe('TAKEDOWN_REVIEW_STARTED');
    expect(entries[0].performedBy).toBe('anonymous_reporter');
    expect(entries[0].metadata.ticketId).toBe(res.ticketId);
  });

  it('removes listing from public search and subscriber view during interim state', async () => {
    // 1. Set to interim takedown_review state
    mockListings.listing_123.status = 'takedown_review';

    // 2. Public view must return null
    const publicTeaser = await getPublicListing('listing_123');
    expect(publicTeaser).toBeNull();

    // 3. Other subscribers must be blocked
    await expect(getSubscriberListing('token_subscriber_other', 'listing_123')).rejects.toThrow('This listing is under review.');

    // 4. Lead Investor (owner) must still have access
    const ownerView = await getSubscriberListing('token_lead_investor', 'listing_123');
    expect(ownerView).toBeDefined();
    expect(ownerView.listing.id).toBe('listing_123');
  });

  it('resolves the ticket to restore the listing', async () => {
    const ticketId = 'ticket_abc';
    mockTickets[ticketId] = {
      ticketId,
      requesterEmail: 'jane@doe.com',
      metadata: {
        listingId: 'listing_123',
        projectId: 'project_456',
      },
    };
    mockListings.listing_123.status = 'takedown_review';

    mockBatchCommit.mockImplementation(async () => {
      mockListings.listing_123.status = 'published';
      mockTickets[ticketId].status = 'closed';
    });

    const res = await resolveTakedownReport('token_admin', ticketId, 'restore', 'Verified owner authorization.');
    expect(res.success).toBe(true);

    // Verify updates queued to batch
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), {
      status: 'published',
      updatedAt: expect.any(String),
    });
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), {
      status: 'closed',
      updatedAt: expect.any(String),
    });

    // Verify ledger entry was set
    expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'TAKEDOWN_RESOLVED_RESTORED',
      performedBy: 'user_admin',
    }));
  });

  it('resolves the ticket to permanently withdraw the listing', async () => {
    const ticketId = 'ticket_abc';
    mockTickets[ticketId] = {
      ticketId,
      requesterEmail: 'jane@doe.com',
      metadata: {
        listingId: 'listing_123',
        projectId: 'project_456',
      },
    };
    mockListings.listing_123.status = 'takedown_review';

    mockBatchCommit.mockImplementation(async () => {
      mockListings.listing_123.status = 'withdrawn';
      mockTickets[ticketId].status = 'closed';
    });

    const res = await resolveTakedownReport('token_admin', ticketId, 'withdraw', 'Valid takedown claim. Deal listing withdrawn.');
    expect(res.success).toBe(true);

    // Verify updates queued to batch
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), {
      status: 'withdrawn',
      updatedAt: expect.any(String),
    });
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), {
      status: 'closed',
      updatedAt: expect.any(String),
    });

    // Verify ledger entry was set
    expect(mockBatchSet).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'TAKEDOWN_RESOLVED_WITHDRAWN',
      performedBy: 'user_admin',
    }));
  });
});
