// ═══════════════════════════════════════════════════════
//  NotificationService Unit Tests
// ═══════════════════════════════════════════════════════

const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();

// Mock firebase admin DB
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        set: mockSet,
        update: mockUpdate,
        get: mockGet
      })),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockGet
    }))
  }
}));

import { NotificationService } from '@/lib/services/notificationService';
import { NOTIFICATION_METADATA } from '@/types/notification';

describe('NotificationService & Dynamic Catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
