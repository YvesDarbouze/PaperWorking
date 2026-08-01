// ═══════════════════════════════════════════════════════
//  Fund Notifications & Reminders Unit Tests (FD-37)
// ═══════════════════════════════════════════════════════

var mockSet = jest.fn();
var mockUpdate = jest.fn();
var mockGet = jest.fn();
var mockAdd = jest.fn();

var mockSendEachForMulticast = jest.fn();
var mockSendRawEmail = jest.fn().mockResolvedValue({ id: 'resend_123' });
var mockIsQuietHoursActive = jest.fn().mockReturnValue(false);

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
import { generateSystemNotificationEmail } from '@/lib/emails/templates/SystemNotificationEmail';

describe('Fund Notifications & Reminders', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-23T16:00:00Z')); // Afternoon EDT (outside quiet hours)
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendRawEmail.mockResolvedValue({ id: 'resend_123' });
    mockGet.mockReset();
    mockSet.mockReset();
    mockAdd.mockReset();
    mockUpdate.mockReset();
  });

  describe('HTML Email Template Rendering', () => {
    it('renders LOAN_STATUS_UPDATE email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'Loan update',
        body: 'Status changed from pending to approved',
        deepLinkUrl: '/dashboard/projects/1/phase-2',
        type: 'LOAN_STATUS_UPDATE',
        objectReference: { dealAddress: '123 Main St' },
        actorName: 'Underwriter'
      });

      expect(rendered.subject).toBe('Loan update');
      expect(rendered.html).toContain('Underwriting Transition Update');
      expect(rendered.html).toContain('123 Main St');
      expect(rendered.html).toContain('Status changed from pending to approved');
      expect(rendered.html).toContain('Review in Lender Vault');
    });

    it('renders VENDOR_BID email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'New Bid',
        body: 'Quote submitted',
        deepLinkUrl: '/dashboard/projects/1/vendors',
        type: 'VENDOR_BID',
        objectReference: { dealAddress: '123 Main St', amount: '$5,000' },
        actorName: 'John Contractor'
      });

      expect(rendered.html).toContain('New Bid Received');
      expect(rendered.html).toContain('John Contractor');
      expect(rendered.html).toContain('$5,000');
      expect(rendered.html).toContain('Review Proposal');
    });

    it('renders LENDER_CHECKLIST_REMINDER email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'Checklist Reminder',
        body: 'Please upload tax document',
        deepLinkUrl: '/dashboard/projects/1/phase-2?card=F3.2',
        type: 'LENDER_CHECKLIST_REMINDER',
        objectReference: { dealAddress: '123 Main St', documentName: 'Tax Return' },
        actorName: 'Underwriter'
      });

      expect(rendered.html).toContain('Lender Checklist Action Required');
      expect(rendered.html).toContain('Tax Return');
      expect(rendered.html).toContain('Upload Document');
    });

    it('renders SLIPPAGE_DETECTED email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'Slippage Alert',
        body: 'Estimated closing has slipped by 7 days',
        deepLinkUrl: '/dashboard/projects/1/phase-2',
        type: 'SLIPPAGE_DETECTED',
        objectReference: { dealAddress: '123 Main St', task: 'Closing Date' },
        actorName: 'System'
      });

      expect(rendered.html).toContain('Slippage Alert: Milestone Overdue');
      expect(rendered.html).toContain('Closing Date');
      expect(rendered.html).toContain('Estimated closing has slipped by 7 days');
      expect(rendered.html).toContain('View Timeline');
    });

    it('renders DOCUMENT_SIGNED email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'Signed document',
        body: 'Investor signed Sub Agreement',
        deepLinkUrl: '/dashboard/projects/1',
        type: 'DOCUMENT_SIGNED',
        objectReference: { dealAddress: '123 Main St', documentName: 'Sub Agreement' },
        actorName: 'Alice Investor'
      });

      expect(rendered.html).toContain('Document E-Signature Confirmed');
      expect(rendered.html).toContain('Sub Agreement');
      expect(rendered.html).toContain('Alice Investor');
      expect(rendered.html).toContain('View Document Vault');
    });

    it('renders PHASE_TRANSITION email template correctly', () => {
      const rendered = generateSystemNotificationEmail({
        title: 'Phase advanced',
        body: 'Project moved to Hold phase',
        deepLinkUrl: '/dashboard/projects/1',
        type: 'PHASE_TRANSITION',
        objectReference: { dealAddress: '123 Main St', phase: 'Hold' },
        actorName: 'LeadInvestor'
      });

      expect(rendered.html).toContain('Project Phase Passage');
      expect(rendered.html).toContain('Hold');
      expect(rendered.html).toContain('Open Project Workspace');
    });
  });

  describe('Failure Isolation', () => {
    it('does not bubble up send email errors', async () => {
      // Mock user preferences to enable email dispatch immediately
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@test.com',
          lastActiveAt: new Date(),
          preferences: {
            emailEnabled: true,
            pushEnabled: false,
          }
        })
      });

      // Force sendRawEmail to throw an error
      mockSendRawEmail.mockRejectedValueOnce(new Error('Resend API Key invalid'));

      // This call should resolve successfully instead of throwing
      const notificationId = await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'DEADLINE_ALERT',
        actor: { uid: 'actor_123', name: 'LeadInvestor' },
        objectReference: { dealAddress: '123 Main St', time: '2 days' },
        deepLinkUrl: '/dashboard/projects/1'
      });

      expect(notificationId).toBeDefined();
      expect(mockSendRawEmail).toHaveBeenCalled();
    });
  });

  describe('Category Toggles Suppression', () => {
    it('suppresses email dispatch if category is disabled in user preferences', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          email: 'recipient@test.com',
          preferences: {
            emailEnabled: true,
            pushEnabled: false,
            categories: {
              // Alerts are suppressed
              alerts: {
                email: false,
                inbox: true
              }
            }
          }
        })
      });

      // SLIPPAGE_DETECTED belongs to category 'alerts'
      await NotificationService.createNotification({
        recipientId: 'user_123',
        type: 'SLIPPAGE_DETECTED',
        actor: { uid: 'actor_123', name: 'System' },
        objectReference: { dealAddress: '123 Main St', task: 'Closing Date' },
        deepLinkUrl: '/dashboard/projects/1'
      });

      // Check that sendRawEmail was NOT called because email was suppressed for alerts category
      expect(mockSendRawEmail).not.toHaveBeenCalled();
    });
  });

  describe('Recipient Logic & Broadcast Routing', () => {
    it('notifies project Lead Investor always and LP only when phase permission views are granted', async () => {
      // Mock project data with Lead Investor and an LP
      mockGet.mockImplementation(async (ref: any) => {
        // First get is project
        if (mockGet.mock.calls.length === 1) {
          return {
            exists: true,
            data: () => ({
              ownerUid: 'lead_investor_uid',
              currentPhase: 2,
              equityParties: [
                {
                  memberId: 'lp_with_view_permission',
                  role: 'LP',
                  phasePermissions: {
                    'phase-2': { canView: true, canEdit: false }
                  }
                },
                {
                  memberId: 'lp_without_view_permission',
                  role: 'LP',
                  phasePermissions: {
                    'phase-2': { canView: false, canEdit: false }
                  }
                }
              ]
            })
          };
        }
        // Subsequent gets are user profile retrievals inside createNotification
        const callCount = mockGet.mock.calls.length;
        const uid = mockGet.mock.calls[callCount - 1][0]; // Extract user UID from collection.doc().get()
        return {
          exists: true,
          data: () => ({
            uid,
            email: `${uid}@example.com`,
            preferences: {
              emailEnabled: true,
            }
          })
        };
      });

      // Spy on createNotification
      const createNotificationSpy = jest.spyOn(NotificationService, 'createNotification');

      await NotificationService.broadcastProjectNotification('project_123', {
        type: 'LOAN_STATUS_UPDATE',
        actor: { uid: 'actor_123', name: 'LeadInvestor' },
        objectReference: { dealAddress: '123 Main St' },
        deepLinkUrl: '/dashboard/projects/1'
      });

      // Verify that createNotification was called for lead_investor_uid and lp_with_view_permission,
      // but NOT for lp_without_view_permission
      const notifiedUids = createNotificationSpy.mock.calls.map(call => call[0].recipientId);
      expect(notifiedUids).toContain('lead_investor_uid');
      expect(notifiedUids).toContain('lp_with_view_permission');
      expect(notifiedUids).not.toContain('lp_without_view_permission');

      createNotificationSpy.mockRestore();
    });
  });
});
