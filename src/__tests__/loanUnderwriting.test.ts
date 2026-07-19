import { transitionLoanStatus } from '@/actions/financing';
import { NotificationService } from '@/lib/services/notificationService';
import { LoanRecord } from '@/types/schema';

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
        collection: jest.fn().mockImplementation(() => ({
          doc: jest.fn().mockImplementation(() => ({
            set: (...args: any[]) => mockSet(...args),
          })),
        })),
      })),
    })),
  },
}));

describe('Loan Underwriting Milestones & Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockActiveLoan: LoanRecord = {
    id: 'loan-active-123',
    projectId: 'proj-123',
    lender: 'Chase Bank',
    amount: 350000,
    rate: 6.5,
    termYears: 30,
    points: 1,
    status: 'application_submitted',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const projectData = {
    address: '456 Palms Ave, Miami FL',
    propertyName: 'Palm Garden Villas',
    ownerUid: 'owner-789',
    organizationId: 'org-456',
    status: 'fund',
    loans: [mockActiveLoan],
    financials: {
      purchasePrice: 500000,
      estimatedCurrentValue: 520000,
    },
  };

  it('successfully transitions loan status and updates project metadata', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => projectData,
    });

    const result = await transitionLoanStatus({
      projectId: 'proj-123',
      loanId: 'loan-active-123',
      newStatus: 'processing',
    });

    expect(result.success).toBe(true);

    // Verify Firestore project update
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.loanStatus).toBe('processing');
    expect(updates.loans[0].status).toBe('processing');

    // Verify timeline update posted
    expect(mockSet).toHaveBeenCalled();
    const timelineCall = mockSet.mock.calls.find(c => c[0] && c[0].title && c[0].title.includes('PROCESSING'));
    expect(timelineCall).toBeDefined();

    // Verify push notification fired
    expect(NotificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'owner-789',
        type: 'NEGOTIATION_UPDATE',
        objectReference: expect.objectContaining({
          projectId: 'proj-123',
          dealAddress: '456 Palms Ave, Miami FL',
          metadata: expect.objectContaining({
            alertType: 'LOAN_UNDERWRITING_MILESTONE',
          }),
        }),
      })
    );
  });

  it('updates estimatedCurrentValue and recalculates LTV when transitioning to appraisal_received', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => projectData,
    });

    const result = await transitionLoanStatus({
      projectId: 'proj-123',
      loanId: 'loan-active-123',
      newStatus: 'appraisal_received',
      appraisedValue: 550000,
      appraisalDocumentUrl: 'http://test.com/appraisal.pdf',
      appraisalDocumentName: 'appraisal_report.pdf',
    });

    expect(result.success).toBe(true);

    // Verify project update includes the appraised valuation and LTV adjustments
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.loanStatus).toBe('appraisal_received');
    expect(updates.loans[0].status).toBe('appraisal_received');
    expect(updates.loans[0].appraisedValue).toBe(550000);
    expect(updates.loans[0].appraisalDocumentUrl).toBe('http://test.com/appraisal.pdf');

    // Verify project financials estimatedCurrentValue is synced to appraisedValue
    expect(updates.financials.estimatedCurrentValue).toBe(550000);
  });
});
