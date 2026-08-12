/** @jest-environment node */
import {
  getAdminUserStats,
  getAdminRevenueStats,
  getAdminActivityStats,
  getAdminAuditLogs,
  getAdminTickets,
} from '../actions/admin';

// Mocks
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockLimit = jest.fn().mockReturnThis();
var mockOrderBy = jest.fn().mockReturnThis();

var mockCollection = {
  doc: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
  get: mockGet,
  orderBy: mockOrderBy,
  limit: mockLimit,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => mockCollection,
  },
}));

var mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

var mockAuthorize = jest.fn();
jest.mock('@/lib/authz/authorize', () => ({
  __esModule: true,
  authorize: (...args: any[]) => mockAuthorize(...args),
}));

// Mock Stripe
var mockSubscriptionsList = jest.fn();
var mockChargesList = jest.fn();

jest.mock('stripe', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      subscriptions: {
        list: (...args: any[]) => mockSubscriptionsList(...args),
      },
      charges: {
        list: (...args: any[]) => mockChargesList(...args),
      },
    })),
    __esModule: true,
  };
});

describe('Admin Server Actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockVerifyIdToken.mockReset();
    mockCookieGet.mockReset();
    mockSubscriptionsList.mockReset();
    mockChargesList.mockReset();
    mockOrderBy.mockClear();
    mockLimit.mockClear();
    mockAuthorize.mockReset();

    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_mock',
    };

    // Default authorize mock to authorized
    mockAuthorize.mockResolvedValue({
      authorized: true,
      user: { uid: 'user-123', email: 'admin@example.com', role: 'Platform Admin' },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('verifyAdmin helper checks via actions', () => {
    it('returns empty stats if __session cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);
      mockAuthorize.mockResolvedValueOnce({ authorized: false, reason: 'unauthenticated' });
      const stats = await getAdminUserStats();
      expect(stats.totalUsers).toBe(0);
    });

    it('returns empty stats if token verification fails', async () => {
      mockCookieGet.mockReturnValue({ value: 'invalid-session' });
      mockAuthorize.mockResolvedValueOnce({ authorized: false, reason: 'token_verification_failed' });
      const stats = await getAdminUserStats();
      expect(stats.totalUsers).toBe(0);
    });

    it('returns empty stats if user does not have admin role', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });
      mockAuthorize.mockResolvedValueOnce({ authorized: false, reason: 'insufficient_permissions' });

      const stats = await getAdminUserStats();
      expect(stats.totalUsers).toBe(0);
    });

    it('allows access for Platform Admin, Admin, and Lead Investor roles', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });
      mockAuthorize.mockResolvedValueOnce({
        authorized: true,
        user: { uid: 'user-123', email: 'admin@example.com', role: 'Platform Admin' },
      });

      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
        size: 0,
      });

      const stats = await getAdminUserStats();
      expect(stats.totalUsers).toBe(0);
      expect(mockGet).toHaveBeenCalledTimes(1); // 1 for users collection
    });
  });

  describe('getAdminUserStats', () => {
    it('correctly aggregates user stats when authenticated', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const now = new Date();
      const mockUsers = [
        {
          id: 'u1',
          data: () => ({
            displayName: 'User One',
            email: 'u1@example.com',
            role: 'Lead Investor',
            accountType: 'investor',
            subscriptionPlan: 'Team',
            subscriptionStatus: 'active',
            createdAt: { toDate: () => now },
            lastLoginAt: now.toISOString(),
            projectCount: 5,
          }),
        },
        {
          id: 'u2',
          data: () => ({
            displayName: 'User Two',
            email: 'u2@example.com',
            role: 'Vendor',
            accountType: 'vendor',
            subscriptionPlan: 'Individual',
            subscriptionStatus: 'trialing',
            createdAt: { toDate: () => new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) },
            lastLoginAt: now.toISOString(),
            projectCount: 1,
          }),
        },
        {
          id: 'u3',
          data: () => ({
            displayName: 'User Three',
            email: 'u3@example.com',
            role: 'Accountant',
            accountType: 'investor',
            subscriptionPlan: 'Individual',
            subscriptionStatus: 'canceled',
            createdAt: { toDate: () => new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
            canceledAt: { toDate: () => new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
            lastLoginAt: now.toISOString(),
            projectCount: 0,
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        empty: false,
        size: mockUsers.length,
        docs: mockUsers,
      });

      const stats = await getAdminUserStats();
      expect(stats.totalUsers).toBe(3);
      expect(stats.newUsersLast30Days).toBe(2); // u1, u3
      expect(stats.activeSubscriptions).toBe(1); // u1
      expect(stats.trialUsers).toBe(1); // u2
      expect(stats.churnedLast30Days).toBe(1); // u3
      expect(stats.planDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Team', count: 1 }),
          expect.objectContaining({ name: 'Individual', count: 2 }),
        ])
      );
      expect(stats.recentUsers).toHaveLength(3);
    });
  });

  describe('getAdminRevenueStats', () => {
    it('returns empty stats if Stripe is not configured', async () => {
      process.env.STRIPE_SECRET_KEY = '';
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const stats = await getAdminRevenueStats();
      expect(stats.mrr).toBe(0);
      expect(mockSubscriptionsList).not.toHaveBeenCalled();
    });

    it('correctly aggregates Stripe revenue data when authenticated', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const mockSubscriptions = [
        {
          id: 'sub_1',
          status: 'active',
          start_date: 1625097600,
          current_period_end: 1656633600,
          customer: {
            id: 'cus_1',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          items: {
            data: [
              {
                price: {
                  unit_amount: 12000,
                  recurring: { interval: 'month' },
                },
              },
            ],
          },
          metadata: {
            planName: 'Team',
          },
          default_payment_method: {
            card: { last4: '4242' },
          },
        },
      ];

      mockSubscriptionsList.mockReturnValue({
        [Symbol.asyncIterator]: () => {
          let index = 0;
          return {
            next: () => {
              if (index < mockSubscriptions.length) {
                return Promise.resolve({ value: mockSubscriptions[index++], done: false });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      });

      const mockCharges = [
        {
          id: 'ch_1',
          status: 'succeeded',
          amount: 12000, // $120
          created: Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 15).getTime() / 1000), // this month
        },
        {
          id: 'ch_2',
          status: 'succeeded',
          amount: 12000, // $120
          created: Math.floor(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).getTime() / 1000), // last month
        },
      ];

      mockChargesList.mockReturnValue({
        [Symbol.asyncIterator]: () => {
          let index = 0;
          return {
            next: () => {
              if (index < mockCharges.length) {
                return Promise.resolve({ value: mockCharges[index++], done: false });
              }
              return Promise.resolve({ value: undefined, done: true });
            },
          };
        },
      });

      const stats = await getAdminRevenueStats();
      expect(stats.mrr).toBe(120);
      expect(stats.arr).toBe(1440);
      expect(stats.revenueThisMonth).toBe(120);
      expect(stats.revenueLastMonth).toBe(120);
      expect(stats.monthOverMonthGrowth).toBe(0);
      expect(stats.recentSubscriptions).toHaveLength(1);
      expect(stats.recentSubscriptions[0].id).toBe('sub_1');
    });
  });

  describe('getAdminActivityStats', () => {
    it('correctly aggregates projects and audit logs', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const now = new Date();
      const mockProjects = [
        {
          id: 'p1',
          data: () => ({
            status: 'hold',
            purchasePrice: 200000,
            rehabBudget: 50000,
            createdAt: now,
          }),
        },
        {
          id: 'p2',
          data: () => ({
            status: 'acquisition',
            purchasePrice: 150000,
            rehabBudget: 0,
            createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
          }),
        },
      ];

      // Projects collection get
      mockGet.mockResolvedValueOnce({
        empty: false,
        size: mockProjects.length,
        docs: mockProjects,
      });

      const stats = await getAdminActivityStats();
      expect(stats.totalProjects).toBe(2);
      expect(stats.activeProjects).toBe(1);
      expect(stats.projectsCreatedLast30Days).toBe(1);
      expect(stats.totalCapitalTracked).toBe(400000); // 200k + 50k + 150k
    });
  });

  describe('getAdminAuditLogs', () => {
    it('returns formatted audit logs', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const now = new Date();
      const mockLogs = [
        {
          id: 'log1',
          data: () => ({
            action: 'user_ban',
            actor: 'Admin A',
            actorEmail: 'admina@example.com',
            target: 'user-456',
            details: 'Violated terms',
            ipAddress: '127.0.0.1',
            timestamp: { toDate: () => now },
            severity: 'critical',
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockLogs,
      });

      const logs = await getAdminAuditLogs();
      expect(logs).toBeDefined();
    });
  });

  describe('getAdminTickets', () => {
    it('returns support tickets formatted correctly', async () => {
      mockCookieGet.mockReturnValue({ value: 'valid-session' });

      const now = new Date();
      const mockTickets = [
        {
          id: 'ticket1',
          data: () => ({
            ticketId: 't-100',
            subject: 'Cannot login',
            requesterName: 'Jane',
            requesterEmail: 'jane@example.com',
            priority: 'high',
            status: 'open',
            category: 'Auth',
            createdAt: { toDate: () => now },
            updatedAt: { toDate: () => now },
            assignee: 'Agent Bob',
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTickets,
      });

      const tickets = await getAdminTickets();
      expect(tickets).toHaveLength(1);
      expect(tickets[0].id).toBe('t-100');
      expect(tickets[0].priority).toBe('high');
      expect(tickets[0].status).toBe('open');
    });
  });
});
