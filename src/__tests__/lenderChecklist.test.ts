import { LenderChecklistItem } from '@/types/schema';
import { evaluateLifecycleAlerts } from '@/lib/notifications/lifecycleAlertEngine';
import { NotificationService } from '@/lib/services/notificationService';

// Mock firebase config
jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

// Mock NotificationService
jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue('notif_123'),
  },
}));

// Mock firebase admin DB and FieldValue
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      doc: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        update: (...args: any[]) => mockUpdate(...args),
        set: (...args: any[]) => mockSet(...args),
      })),
    })),
  },
}));

describe('Lender Package Checklist & Cron Alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-19T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires alerts for pending items when no lastReminderSentAt exists', async () => {
    const mockChecklist: LenderChecklistItem[] = [
      {
        id: 'item-1',
        label: '3 years Personal Tax Returns',
        status: 'pending',
        reminderCadence: 'weekly',
      },
      {
        id: 'item-2',
        label: 'Proforma',
        status: 'uploaded',
        fileUrl: 'http://test.com/file.pdf',
        reminderCadence: 'weekly',
      },
    ];

    const projectData = {
      address: '123 Test St',
      propertyName: 'Test Property',
      ownerUid: 'owner-456',
      status: 'fund',
      lenderChecklist: mockChecklist,
      updatedAt: new Date(),
    };

    // Mock debounce get to say it is not debounced for base evaluations
    mockGet.mockResolvedValue({
      exists: false,
    });

    await evaluateLifecycleAlerts('proj-123', projectData);

    // Verify NotificationService was called for pending item-1 but not item-2
    expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'owner-456',
        type: 'NEGOTIATION_UPDATE',
        objectReference: expect.objectContaining({
          projectId: 'proj-123',
          dealAddress: '123 Test St',
          metadata: expect.objectContaining({
            title: expect.stringContaining('3 years Personal Tax Returns'),
          }),
        }),
      })
    );

    // Verify the project was updated with lastReminderSentAt for the fired item
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updatedChecklist = mockUpdate.mock.calls[0][0].lenderChecklist as LenderChecklistItem[];
    expect(updatedChecklist[0].lastReminderSentAt).toBeDefined();
    expect(updatedChecklist[1].lastReminderSentAt).toBeUndefined(); // item-2 was uploaded, so no reminder sent
  });

  it('respects reminder cadence intervals and debounces frequent checks', async () => {
    const lastSentDate = new Date('2026-07-18T12:00:00Z'); // 24 hours ago
    const mockChecklist: LenderChecklistItem[] = [
      {
        id: 'item-daily',
        label: 'Daily Pending',
        status: 'pending',
        reminderCadence: 'daily',
        lastReminderSentAt: lastSentDate.toISOString(),
      },
      {
        id: 'item-weekly',
        label: 'Weekly Pending',
        status: 'pending',
        reminderCadence: 'weekly',
        lastReminderSentAt: lastSentDate.toISOString(),
      },
    ];

    const projectData = {
      address: '123 Test St',
      propertyName: 'Test Property',
      ownerUid: 'owner-456',
      status: 'fund',
      lenderChecklist: mockChecklist,
      updatedAt: new Date(),
    };

    mockGet.mockResolvedValue({
      exists: false,
    });

    await evaluateLifecycleAlerts('proj-123', projectData);

    // Only 'item-daily' should fire because 24 hours elapsed. 'item-weekly' needs 7 days.
    expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        objectReference: expect.objectContaining({
          metadata: expect.objectContaining({
            title: expect.stringContaining('Daily Pending'),
          }),
        }),
      })
    );

    const updatedChecklist = mockUpdate.mock.calls[0][0].lenderChecklist as LenderChecklistItem[];
    expect(updatedChecklist[0].lastReminderSentAt).toBe(new Date('2026-07-19T12:00:00Z').toISOString());
    expect(updatedChecklist[1].lastReminderSentAt).toBe(lastSentDate.toISOString()); // Unchanged
  });

  it('does not fire reminders if cadence is set to none', async () => {
    const mockChecklist: LenderChecklistItem[] = [
      {
        id: 'item-none',
        label: 'No Alerts Item',
        status: 'pending',
        reminderCadence: 'none',
      },
    ];

    const projectData = {
      address: '123 Test St',
      propertyName: 'Test Property',
      ownerUid: 'owner-456',
      status: 'fund',
      lenderChecklist: mockChecklist,
      updatedAt: new Date(),
    };

    mockGet.mockResolvedValue({
      exists: false,
    });

    await evaluateLifecycleAlerts('proj-123', projectData);

    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
