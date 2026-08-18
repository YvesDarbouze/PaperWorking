// ═══════════════════════════════════════════════════════
//  NotificationService Unit Tests
// ═══════════════════════════════════════════════════════

const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockAdd = jest.fn();

const mockSendEachForMulticast = jest.fn();
const mockSendRawEmail = jest.fn().mockResolvedValue({ id: 'resend_123' });
const mockIsQuietHoursActive = jest.fn().mockReturnValue(false);

// Mock CommunicationEngine
jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    sendRawEmail: (...args: any[]) => mockSendRawEmail(...args),
    isQuietHoursActive: (...args: any[]) => mockIsQuietHoursActive(...args),
  }
}));

// Mock firebase admin DB and Messaging
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        set: (...args: any[]) => mockSet(...args),
        update: (...args: any[]) => mockUpdate(...args),
        get: (...args: any[]) => mockGet(...args)
      })),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: (...args: any[]) => mockGet(...args),
      add: (...args: any[]) => mockAdd(...args)
    }))
  },
  adminMessaging: {
    sendEachForMulticast: (...args: any[]) => mockSendEachForMulticast(...args)
  }
}));

import { NotificationService } from '@/lib/services/notificationService';
import { NOTIFICATION_METADATA } from '@/types/notification';

describe('NotificationService & Dynamic Catalog', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // 12:00 PM EDT (outside quiet/DND hours)
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // Reset to 12:00 PM EDT (outside quiet/DND hours) before each test
  });

  describe('Template Formatting and Urgency Level Mapping', () => {
    it('formats VENDOR_BID notifications correctly', () => {
      const type = 'VENDOR_BID';
      const actorName = 'Supreme Painters';
      const objectReference = {
        vendor: 'Supreme Painters',
        amount: '$14,500.00',
        dealAddress: '456 Oak Avenue',
        task: 'Interior Paint'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('actionable');
      expect(meta.channels).toEqual(['in-app', 'email']);

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Supreme Painters bid $14,500.00 on 456 Oak Avenue');
      expect(body).toContain("Interior Paint");
    });

    it('formats INVEST_INVITE notifications correctly', () => {
      const type = 'INVEST_INVITE';
      const actorName = 'Realty Fund LLC';
      const objectReference = {
        dealAddress: '789 Pine Road'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('critical');
      expect(meta.channels).toEqual(['in-app', 'email', 'push']);

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe("You've been invited to invest in 789 Pine Road");
      expect(body).toContain('789 Pine Road');
    });

    it('formats TASK_COMPLETE notifications correctly', () => {
      const type = 'TASK_COMPLETE';
      const actorName = 'Mark Johnson';
      const objectReference = {
        teammate: 'Mark Johnson',
        task: 'Roof Inspection',
        dealAddress: '101 Maple Drive'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('informational');
      expect(meta.channels).toEqual(['in-app']);

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Mark Johnson completed Roof Inspection on 101 Maple Drive');
      expect(body).toContain('Roof Inspection');
    });

    it('formats PHASE_TRANSITION notifications correctly', () => {
      const type = 'PHASE_TRANSITION';
      const actorName = 'System';
      const objectReference = {
        dealAddress: '222 Birch Lane',
        phase: 'Holding & Rehab'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('informational');

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('222 Birch Lane moved to Holding & Rehab phase');
      expect(body).toContain('Holding & Rehab');
    });

    it('formats DEADLINE_ALERT notifications correctly', () => {
      const type = 'DEADLINE_ALERT';
      const actorName = 'Escrow Bot';
      const objectReference = {
        dealAddress: '333 Cedar Court',
        time: '48 hours'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('critical');

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Contingency deadline for 333 Cedar Court expires in 48 hours');
      expect(body).toContain('333 Cedar Court');
    });

    it('formats BILLING_CHARGED notifications correctly', () => {
      const type = 'BILLING_CHARGED';
      const actorName = 'Stripe';
      const objectReference = {
        card: 'Mastercard',
        amount: '$299.00',
        plan: 'Premium Portfolio Plan'
      };

      const meta = NOTIFICATION_METADATA[type];
      expect(meta.urgency).toBe('actionable');

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Mastercard charged $299.00 — Premium Portfolio Plan');
      expect(body).toContain('Premium Portfolio Plan');
    });

    it('formats DOCUMENT_SIGNED notifications correctly', () => {
      const type = 'DOCUMENT_SIGNED';
      const actorName = 'Sarah Connor';
      const objectReference = {
        documentName: 'Purchase Agreement',
        dealAddress: '777 Lucky Way'
      };

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Sarah Connor signed Purchase Agreement for 777 Lucky Way');
      expect(body).toContain('Purchase Agreement');
    });

    it('formats RECEIPT_APPROVAL notifications correctly', () => {
      const type = 'RECEIPT_APPROVAL';
      const actorName = 'John Doe';
      const objectReference = {
        amount: '$450.00',
        dealAddress: '999 High St'
      };

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('John Doe uploaded receipt of $450.00 for 999 High St — approval required');
      expect(body).toContain('John Doe');
    });

    it('formats TEAM_INVITE notifications correctly', () => {
      const type = 'TEAM_INVITE';
      const actorName = 'Aria Stark';
      const objectReference = {
        organizationName: 'Winterfell Holdings'
      };

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Aria Stark invited you to join team Winterfell Holdings');
      expect(body).toContain('Winterfell Holdings');
    });

    it('formats OVER_IMPROVEMENT_ALERT notifications correctly', () => {
      const type = 'OVER_IMPROVEMENT_ALERT';
      const actorName = 'System';
      const objectReference = {
        dealAddress: '555 Gold Coast'
      };

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('Over-improvement risk flagged on 555 Gold Coast: rehab exceeds 30% of ARV');
      expect(body).toContain('555 Gold Coast');
    });

    it('formats BURN_RATE_WARNING notifications correctly', () => {
      const type = 'BURN_RATE_WARNING';
      const actorName = 'System';
      const objectReference = {
        dealAddress: '123 Burn Court',
        dailyBurnRate: '$120.00'
      };

      const { title, body } = NotificationService.buildNotificationContent(
        type,
        objectReference,
        actorName
      );

      expect(title).toBe('123 Burn Court holding cost warning: burn rate is $120.00/day');
      expect(body).toContain('$120.00');
    });
  });

  describe('Validation Guardrails', () => {
    it('throws error when VENDOR_BID is missing required fields', () => {
      expect(() => {
        NotificationService.buildNotificationContent('VENDOR_BID', {}, 'Vendor');
      }).toThrow();
    });

    it('throws error when DEADLINE_ALERT is missing expiration time', () => {
      expect(() => {
        NotificationService.buildNotificationContent('DEADLINE_ALERT', { dealAddress: '123 St' }, 'System');
      }).toThrow();
    });

    it('throws error when BILLING_CHARGED is missing plan or card', () => {
      expect(() => {
        NotificationService.buildNotificationContent('BILLING_CHARGED', { amount: '$10' }, 'Stripe');
      }).toThrow();
    });
  });

  describe('Firestore Persistence Operations', () => {
    it('creates and saves notifications to firestore successfully', async () => {
      mockSet.mockResolvedValueOnce(undefined);
      // mock mockGet returning exists: false so push is skipped in this test
      mockGet.mockResolvedValueOnce({ exists: false });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'James Builder' },
        objectReference: { dealAddress: '100 Sunset Blvd' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockSet).toHaveBeenCalledTimes(1);

      // Verify structure passed to doc.set
      const setArg = mockSet.mock.calls[0][0];
      expect(setArg.recipientId).toBe('user_123');
      expect(setArg.type).toBe('INVEST_INVITE');
      expect(setArg.urgencyLevel).toBe('critical');
      expect(setArg.channels).toEqual(['in-app', 'email', 'push']);
      expect(setArg.deepLinkUrl).toBe('/dashboard/projects/p_999');
      expect(setArg.read).toBe(false);
      expect(setArg.archived).toBe(false);
    });

    it('sends FCM push notification if user has registered tokens', async () => {
      mockSet.mockResolvedValueOnce(undefined);
      // Mock user document returning fcmTokens and pushEnabled = true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fcmTokens: ['token_abc'],
          lastActiveAt: new Date(),
          preferences: { pushEnabled: true }
        })
      });
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        responses: [{ success: true }]
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'James Builder' },
        objectReference: { dealAddress: '100 Sunset Blvd' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
      
      const pushPayload = mockSendEachForMulticast.mock.calls[0][0];
      expect(pushPayload.tokens).toEqual(['token_abc']);
      expect(pushPayload.notification.title).toBe("Investment Invitation — 100 Sunset Blvd");
    });

    it('marks notifications as read in firestore', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);

      await NotificationService.markAsRead('not_abc');

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.read).toBe(true);
      expect(updateArg.readAt).toBeDefined();
    });

    it('archives notifications in firestore', async () => {
      mockUpdate.mockResolvedValueOnce(undefined);

      await NotificationService.archiveNotification('not_abc');

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg.archived).toBe(true);
    });
  });

  describe('Email Opt-out & Quiet Hours Dispatching', () => {
    beforeEach(() => {
      mockSendRawEmail.mockClear();
      mockAdd.mockClear();
      mockGet.mockClear();
    });

    it('dispatches email immediately when user has enabled email and is outside quiet hours', async () => {
      jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // 12:00 PM EDT (outside quiet hours)
      mockSet.mockResolvedValueOnce(undefined);
      // Mock user document returning emailEnabled = true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            quietHours: { enabled: true, start: '22:00', end: '08:00', timezone: 'America/New_York' }
          }
        })
      });
      mockIsQuietHoursActive.mockReturnValueOnce(false); // Outside quiet hours

      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'James Builder' },
        objectReference: { dealAddress: '100 Sunset Blvd' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(mockSendRawEmail).toHaveBeenCalledTimes(1);
      expect(mockSendRawEmail).toHaveBeenCalledWith(
        ['recipient@example.com'],
        "Investment Invitation — 100 Sunset Blvd",
        expect.stringContaining("100 Sunset Blvd")
      );
      expect(mockAdd).not.toHaveBeenCalled(); // No queued_emails added
    });

    it('queues email when user is inside quiet hours', async () => {
      jest.setSystemTime(new Date('2026-05-23T03:00:00Z')); // 11:00 PM EDT (inside quiet hours)
      mockSet.mockResolvedValueOnce(undefined);
      mockAdd.mockResolvedValueOnce({ id: 'queued_123' });
      // Mock user document returning emailEnabled = true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            quietHours: { enabled: true, start: '22:00', end: '08:00', timezone: 'America/New_York' }
          }
        })
      });
      mockIsQuietHoursActive.mockReturnValueOnce(true); // Inside quiet hours

      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'James Builder' },
        objectReference: { dealAddress: '100 Sunset Blvd' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(mockSendRawEmail).not.toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledTimes(1);
      const addArg = mockAdd.mock.calls[0][0];
      expect(addArg.recipientId).toBe('user_123');
      expect(addArg.recipientEmail).toBe('recipient@example.com');
      expect(addArg.status).toBe('pending');
    });

    it('does not send or queue email when user has opted out of email', async () => {
      jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // Outside quiet hours
      mockSet.mockResolvedValueOnce(undefined);
      // Mock user document returning emailEnabled = false
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: false
          }
        })
      });

      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'James Builder' },
        objectReference: { dealAddress: '100 Sunset Blvd' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(mockSendRawEmail).not.toHaveBeenCalled();
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('Granular Category Preferences Enforcement', () => {
    beforeEach(() => {
      mockSendRawEmail.mockClear();
      mockAdd.mockClear();
      mockGet.mockClear();
      mockSet.mockClear();
      mockSendEachForMulticast.mockClear();
    });

    it('filters out in-app and email channels if user opted out of them for tasks category', async () => {
      mockSet.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            categories: {
              tasks: { inbox: true, email: false, push: false }
            }
          }
        })
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'TASK_COMPLETE',
        actor: { uid: 'actor_456', name: 'Mark' },
        objectReference: { teammate: 'Mark', task: 'Roofing', dealAddress: '123 Main' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockSet).toHaveBeenCalledTimes(1); // inbox is true, so it saves doc to firestore
      expect(mockSendRawEmail).not.toHaveBeenCalled(); // email is false
      expect(mockSendEachForMulticast).not.toHaveBeenCalled(); // push is false
    });

    it('filters out in-app document write if user opted out of inbox for syndication category', async () => {
      mockSet.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            categories: {
              syndication: { inbox: false, email: true, push: false }
            }
          }
        })
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'INVEST_INVITE',
        actor: { uid: 'actor_456', name: 'Realty LLC' },
        objectReference: { dealAddress: '123 Main' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockSet).not.toHaveBeenCalled(); // inbox is false, so no firestore write
      expect(mockSendRawEmail).toHaveBeenCalledTimes(1); // email is true
      expect(mockSendEachForMulticast).not.toHaveBeenCalled(); // push is false
    });

    it('enforces billing and deadlines as mandatory channels (inbox and email cannot be disabled)', async () => {
      mockSet.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            categories: {
              billing: { inbox: false, email: false, push: false } // Attempting to disable all
            }
          }
        })
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'BILLING_CHARGED',
        actor: { uid: 'stripe_123', name: 'Stripe' },
        objectReference: { card: 'Visa', amount: '$50', plan: 'Gold' },
        deepLinkUrl: '/dashboard/settings/billing'
      });

      expect(notificationId).toBeDefined();
      expect(mockSet).toHaveBeenCalledTimes(1); // inbox is forced true
      expect(mockSendRawEmail).toHaveBeenCalledTimes(1); // email is forced true
    });
  });

  describe('Notification Fatigue & DND Verification', () => {
    beforeEach(() => {
      mockSendRawEmail.mockClear();
      mockAdd.mockClear();
      mockGet.mockClear();
      mockSet.mockClear();
      mockSendEachForMulticast.mockClear();
    });

    it('queues non-critical notifications immediately as isBatchable: true', async () => {
      jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // 12:00 PM EDT (outside DND)

      mockSet.mockResolvedValueOnce(undefined);
      mockAdd.mockResolvedValueOnce({ id: 'queued_batchable' });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            pushEnabled: true,
            timezone: 'America/New_York'
          }
        })
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'VENDOR_BID',
        actor: { uid: 'actor_456', name: 'Supreme Painters' },
        objectReference: {
          vendor: 'Supreme Painters',
          amount: '$14,500.00',
          dealAddress: '456 Oak Avenue',
          task: 'Interior Paint',
          projectId: 'p_999'
        },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockSendRawEmail).not.toHaveBeenCalled();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
      
      expect(mockAdd).toHaveBeenCalledTimes(1);
      const addArg = mockAdd.mock.calls[0][0];
      expect(addArg.isBatchable).toBe(true);
      expect(addArg.recipientId).toBe('user_123');
    });

    it('queues critical notifications triggered at 3:00 AM local time as isBatchable: false', async () => {
      jest.setSystemTime(new Date('2026-05-23T07:00:00Z')); // 3:00 AM EDT (in DND)

      mockSet.mockResolvedValueOnce(undefined);
      mockAdd.mockResolvedValueOnce({ id: 'queued_critical' });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          fcmTokens: ['token_abc'],
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            pushEnabled: true,
            timezone: 'America/New_York'
          }
        })
      });

      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'DEADLINE_ALERT',
        actor: { uid: 'actor_456', name: 'System' },
        objectReference: { dealAddress: '100 Sunset Blvd', time: '48 hours' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(notificationId).toBeDefined();
      expect(mockSendRawEmail).not.toHaveBeenCalled();
      expect(mockSendEachForMulticast).not.toHaveBeenCalled();

      expect(mockAdd).toHaveBeenCalledTimes(1);
      const addArg = mockAdd.mock.calls[0][0];
      expect(addArg.isBatchable).toBe(false);
      expect(addArg.recipientId).toBe('user_123');
    });

    it('silences push notifications during DND and dispatches them outside DND for critical events', async () => {
      // 1. Inside DND (3:00 AM local time)
      jest.setSystemTime(new Date('2026-05-23T07:00:00Z')); // 3:00 AM EDT

      mockSet.mockResolvedValueOnce(undefined);
      mockAdd.mockResolvedValueOnce({ id: 'queued_critical_dnd' });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          fcmTokens: ['token_abc'],
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            pushEnabled: true,
            timezone: 'America/New_York'
          }
        })
      });

      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'DEADLINE_ALERT',
        actor: { uid: 'actor_456', name: 'System' },
        objectReference: { dealAddress: '100 Sunset Blvd', time: '48 hours' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledTimes(1);

      // Reset mocks for outside DND test
      mockSet.mockClear();
      mockAdd.mockClear();
      mockGet.mockClear();
      mockSendEachForMulticast.mockClear();

      // 2. Outside DND (12:00 PM local time)
      jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // 12:00 PM EDT

      mockSet.mockResolvedValueOnce(undefined);
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@example.com',
          fcmTokens: ['token_abc'],
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            pushEnabled: true,
            timezone: 'America/New_York'
          }
        })
      });
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        responses: [{ success: true }]
      });

      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'DEADLINE_ALERT',
        actor: { uid: 'actor_456', name: 'System' },
        objectReference: { dealAddress: '100 Sunset Blvd', time: '48 hours' },
        deepLinkUrl: '/dashboard/projects/p_999'
      });

      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });
});
