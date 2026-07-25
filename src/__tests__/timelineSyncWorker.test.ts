import { timelineSyncWorker } from '@/lib/services/timelineSyncWorker';
import { jobQueue } from '@/lib/queue/jobQueue';
import { adminDb } from '@/lib/firebase/admin';
import { NotificationService } from '@/lib/services/notificationService';

// ── Shared Mocks ──────────────────────────────────────────────────────────
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockLoansGet = jest.fn();

const mockCollection = {
  doc: jest.fn().mockImplementation(() => ({
    get: mockGet,
    update: mockUpdate,
    collection: jest.fn(() => ({
      get: mockLoansGet,
    })),
  })),
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminDb: {
    collection: (_name: string) => mockCollection,
  },
}));

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue('not_123'),
  },
}));

// Mock Redis client for queue test
const mockLpush = jest.fn();
const mockExpire = jest.fn();
jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: {
    status: 'ready',
    lpush: (...args: any[]) => mockLpush(...args),
    expire: (...args: any[]) => mockExpire(...args),
  },
}));

describe('FD-29: Closing Timeline Sync Worker & Event Integration', () => {
  const PROJECT_ID = 'proj_timeline_29';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('timelineSyncWorker.sync', () => {
    it('instantiates Conventional template milestones when project has Conventional loan', async () => {
      // Mock Project Doc
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          propertyName: '123 Conventional Rd',
          financials: {
            financingType: 'Financed',
            psaEffectiveDate: '2026-07-01',
          },
          closingTimeline: [],
          closingTimelineTemplate: null,
        }),
      });

      // Mock Loans subcollection (Conventional)
      mockLoansGet.mockResolvedValue({
        docs: [
          {
            id: 'loan_conv_123',
            data: () => ({
              instrument: 'Conventional',
              amountCents: 30000000,
            }),
          },
        ],
      });

      mockUpdate.mockResolvedValue(undefined);

      const result = await timelineSyncWorker.sync(PROJECT_ID);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          closingTimelineTemplate: 'financed_conventional',
          closingTimeline: expect.arrayContaining([
            expect.objectContaining({ key: 'financing', targetDate: '2026-07-16' }),
            expect.objectContaining({ key: 'closing', targetDate: '2026-08-15' }),
          ]),
        })
      );
    });

    it('instantiates Cash template milestones when project is All Cash', async () => {
      // Mock Project Doc
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          propertyName: '456 Cash Way',
          financials: {
            financingType: 'All Cash',
            psaEffectiveDate: '2026-07-01',
          },
          closingTimeline: [],
          closingTimelineTemplate: null,
        }),
      });

      // Mock Loans subcollection (empty)
      mockLoansGet.mockResolvedValue({
        docs: [],
      });

      mockUpdate.mockResolvedValue(undefined);

      const result = await timelineSyncWorker.sync(PROJECT_ID);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          closingTimelineTemplate: 'cash_hard_money',
          closingTimeline: expect.arrayContaining([
            expect.objectContaining({ key: 'title', targetDate: '2026-07-06' }),
            expect.objectContaining({ key: 'closing', targetDate: '2026-07-13' }),
          ]),
        })
      );
    });

    it('syncs actual dates based on project states automatically', async () => {
      // Mock Project Doc: title cleared, loanStatus Conditions-Cleared
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          propertyName: '123 Conventional Rd',
          financials: {
            financingType: 'Financed',
            psaEffectiveDate: '2026-07-01',
          },
          loanStatus: 'Conditions-Cleared',
          closingRoom: {
            chainOfTitleStatus: 'verified',
          },
          closingTimelineTemplate: 'financed_conventional',
          closingTimeline: [
            { id: 'm-conv-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: '2026-07-16', completed: false },
            { id: 'm-conv-2', key: 'title', label: 'Title Clearance', targetOffsetDays: 20, targetDate: '2026-07-21', completed: false },
            { id: 'm-conv-3', key: 'appraisal', label: 'Appraisal Completion', targetOffsetDays: 25, targetDate: '2026-07-26', completed: false },
            { id: 'm-conv-4', key: 'conditions_cleared', label: 'Financing Conditions Cleared', targetOffsetDays: 30, targetDate: '2026-07-31', completed: false },
            { id: 'm-conv-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 35, targetDate: '2026-08-05', completed: false },
            { id: 'm-conv-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 45, targetDate: '2026-08-15', completed: false },
          ],
        }),
      });

      mockLoansGet.mockResolvedValue({
        docs: [
          {
            id: 'loan_conv_123',
            data: () => ({
              instrument: 'Conventional',
            }),
          },
        ],
      });

      mockUpdate.mockResolvedValue(undefined);

      const result = await timelineSyncWorker.sync(PROJECT_ID);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          closingTimeline: expect.arrayContaining([
            expect.objectContaining({ key: 'title', completed: true }),
            expect.objectContaining({ key: 'conditions_cleared', completed: true }),
          ]),
        })
      );
    });

    it('flags overdue milestones with slippage: true and fires a notification', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ownerUid: 'lead_investor_uid',
          propertyName: '123 Conventional Rd',
          financials: {
            financingType: 'Financed',
            psaEffectiveDate: '2026-06-01',
          },
          closingTimelineTemplate: 'financed_conventional',
          closingTimeline: [
            { id: 'm-conv-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: '2026-06-16', completed: false, slippage: false },
          ],
        }),
      });

      mockLoansGet.mockResolvedValue({
        docs: [
          {
            id: 'loan_conv_123',
            data: () => ({
              instrument: 'Conventional',
            }),
          },
        ],
      });

      mockUpdate.mockResolvedValue(undefined);

      const result = await timelineSyncWorker.sync(PROJECT_ID);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          closingTimeline: expect.arrayContaining([
            expect.objectContaining({ key: 'financing', slippage: true }),
          ]),
        })
      );

      // Verify that notification was dispatched
      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'lead_investor_uid',
          type: 'SLIPPAGE_DETECTED',
          objectReference: expect.objectContaining({
            projectId: PROJECT_ID,
            dealAddress: '123 Conventional Rd',
            task: 'Financing Approval',
          }),
        })
      );
    });
  });

  describe('Job Enqueuing Integration', () => {
    it('enqueues timeline_sync job to Redis', async () => {
      mockLpush.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      const jobId = await jobQueue.enqueue('timeline_sync', { projectId: PROJECT_ID });

      expect(jobId).toBeDefined();
      expect(mockLpush).toHaveBeenCalledWith(
        'paperworking:jobs:timeline_sync',
        expect.stringContaining(PROJECT_ID)
      );
    });
  });
});
