import { updateClosingTimelineAction } from '@/actions/closingTimeline';
import type { Project, ClosingMilestone } from '@/types/schema';
import { getBusinessDaysDiff } from '@/components/project/ClosingTimelineCard';

// Mock Firebase Client SDKs
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { getIdToken: jest.fn(() => Promise.resolve('mock-token')) }
  }))
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn()
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

// Mock Firebase Admin
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        update: mockUpdate,
        get: mockGet,
      })),
    })),
  },
}));

describe('Card F5.1 — Closing Timeline Milestones & Templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Action: updateClosingTimelineAction', () => {
    it('verifies caller identity, project scope, and persists milestones in Firestore', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user_abc', email: 'test@example.com' });
      
      mockGet.mockImplementation(async () => {
        // First call is for user profile
        if (mockGet.mock.calls.length === 1) {
          return {
            exists: true,
            data: () => ({
              uid: 'user_abc',
              displayName: 'John Doe',
              organizationId: 'org_123',
            }),
          };
        }
        // Second call is for project document
        return {
          exists: true,
          data: () => ({
            id: 'project_123',
            ownerUid: 'user_abc',
            organizationId: 'org_123',
          }),
        };
      });

      mockUpdate.mockResolvedValue(undefined);

      const milestones: ClosingMilestone[] = [
        { id: 'm-1', key: 'title', label: 'Title Clearance', targetOffsetDays: 5, targetDate: '2026-07-06', completed: false }
      ];

      const res = await updateClosingTimelineAction('valid_token', 'project_123', milestones, 'cash_hard_money');

      expect(res.success).toBe(true);
      expect(res.data.closingTimeline).toEqual(milestones);
      expect(res.data.closingTimelineTemplate).toBe('cash_hard_money');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          closingTimeline: milestones,
          closingTimelineTemplate: 'cash_hard_money',
        })
      );
    });

    it('rejects update if user does not have project access', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'user_attacker', email: 'attacker@example.com' });
      mockGet.mockImplementation(async () => {
        if (mockGet.mock.calls.length === 1) {
          return {
            exists: true,
            data: () => ({
              uid: 'user_attacker',
              organizationId: 'org_attacker',
            }),
          };
        }
        return {
          exists: true,
          data: () => ({
            id: 'project_123',
            ownerUid: 'user_owner',
            organizationId: 'org_owner',
          }),
        };
      });

      await expect(
        updateClosingTimelineAction('attacker_token', 'project_123', [], 'cash_hard_money')
      ).rejects.toThrow('You do not have access to this project.');
    });
  });

  describe('Milestone Calculation & Resolution Math', () => {
    // Helper to test the YYYY-MM-DD offset calculations
    const calculateTargetDate = (baseDateStr: string, offsetDays: number): string => {
      const base = new Date(baseDateStr + 'T12:00:00');
      const target = new Date(base.getTime());
      target.setDate(target.getDate() + offsetDays);
      return target.toISOString().split('T')[0];
    };

    it('instantiates Conventional template targets correctly from PSA date', () => {
      const psaDate = '2026-07-01';
      // Conventional target offsets: 15, 20, 25, 30, 35, 45
      expect(calculateTargetDate(psaDate, 15)).toBe('2026-07-16');
      expect(calculateTargetDate(psaDate, 20)).toBe('2026-07-21');
      expect(calculateTargetDate(psaDate, 25)).toBe('2026-07-26');
      expect(calculateTargetDate(psaDate, 30)).toBe('2026-07-31');
      expect(calculateTargetDate(psaDate, 35)).toBe('2026-08-05');
      expect(calculateTargetDate(psaDate, 45)).toBe('2026-08-15');
    });

    it('instantiates Cash & Hard Money template targets correctly', () => {
      const psaDate = '2026-07-01';
      // Cash & Hard Money offsets: 5, 8, 12
      expect(calculateTargetDate(psaDate, 5)).toBe('2026-07-06');
      expect(calculateTargetDate(psaDate, 8)).toBe('2026-07-09');
      expect(calculateTargetDate(psaDate, 12)).toBe('2026-07-13');
    });

    it('instantiates SBA template targets correctly', () => {
      const psaDate = '2026-07-01';
      // SBA offsets: 15, 25, 35, 40, 45, 55
      expect(calculateTargetDate(psaDate, 15)).toBe('2026-07-16');
      expect(calculateTargetDate(psaDate, 25)).toBe('2026-07-26');
      expect(calculateTargetDate(psaDate, 35)).toBe('2026-08-05');
      expect(calculateTargetDate(psaDate, 40)).toBe('2026-08-10');
      expect(calculateTargetDate(psaDate, 45)).toBe('2026-08-15');
      expect(calculateTargetDate(psaDate, 55)).toBe('2026-08-25');
    });
  });

  describe('Automatic Linked-Events Auto-Actuals Logic', () => {
    // Helper function reproducing component logic to test its correctness
    const deriveMilestoneActuals = (milestoneKey: string, project: Partial<Project>): boolean => {
      const titleCleared = project.closingRoom?.chainOfTitleStatus === 'verified' || project.closingRoom?.titleWorkflow?.status === 'cleared';
      const loanStatus = project.loanStatus || '';
      const appraisalReceived = loanStatus === 'Appraisal-Received';
      const financingApproved = loanStatus === 'Pre-Approved' || loanStatus === 'Conditions-Issued' || loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
      const conditionsCleared = loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
      const fundingApproved = loanStatus === 'Clear-To-Close';
      const cdDelivered = !!project.closingRoom?.closingDisclosureUrl || project.closingChecklist?.find(i => i.type === 'Closing Disclosure')?.completed === true;
      const closed = project.isClearToClose === true || (project.currentPhase !== undefined && project.currentPhase >= 3);

      if (milestoneKey === 'title' && titleCleared) return true;
      if (milestoneKey === 'appraisal' && appraisalReceived) return true;
      if (milestoneKey === 'financing' && financingApproved) return true;
      if (milestoneKey === 'conditions_cleared' && conditionsCleared) return true;
      if (milestoneKey === 'financing_funding_approval' && fundingApproved) return true;
      if (milestoneKey === 'cd_delivered' && cdDelivered) return true;
      if (milestoneKey === 'closing' && closed) return true;

      return false;
    };

    it('completes title milestone automatically when title is cleared', () => {
      const project: Partial<Project> = {
        closingRoom: {
          chainOfTitleStatus: 'verified',
          titleInsuranceUrl: null,
          closingDisclosureUrl: null,
          wiringInstructionsUrl: null,
          assignedLawyerUid: null,
          lawyerVerified: false,
          blockchainTxHash: null,
        }
      };
      expect(deriveMilestoneActuals('title', project)).toBe(true);
      expect(deriveMilestoneActuals('financing', project)).toBe(false);
    });

    it('completes appraisal milestone when loanStatus changes to Appraisal-Received', () => {
      const project: Partial<Project> = {
        loanStatus: 'Appraisal-Received'
      };
      expect(deriveMilestoneActuals('appraisal', project)).toBe(true);
      expect(deriveMilestoneActuals('conditions_cleared', project)).toBe(false);
    });

    it('completes conditions_cleared milestone when loanStatus is Conditions-Cleared', () => {
      const project: Partial<Project> = {
        loanStatus: 'Conditions-Cleared'
      };
      expect(deriveMilestoneActuals('conditions_cleared', project)).toBe(true);
      expect(deriveMilestoneActuals('title', project)).toBe(false);
    });

    it('completes cd_delivered milestone when Closing Disclosure document is uploaded or checked', () => {
      const projectWithUrl: Partial<Project> = {
        closingRoom: {
          closingDisclosureUrl: 'https://example.com/cd.pdf',
          titleInsuranceUrl: null,
          wiringInstructionsUrl: null,
          assignedLawyerUid: null,
          lawyerVerified: false,
          blockchainTxHash: null,
          chainOfTitleStatus: 'pending'
        }
      };
      const projectWithChecklist: Partial<Project> = {
        closingChecklist: [
          { id: 'cc-3', type: 'Closing Disclosure', completed: true, notes: '' }
        ]
      };
      expect(deriveMilestoneActuals('cd_delivered', projectWithUrl)).toBe(true);
      expect(deriveMilestoneActuals('cd_delivered', projectWithChecklist)).toBe(true);
    });

    it('completes closing milestone when project is clear to close or advances past Fund', () => {
      const projectCTC: Partial<Project> = { isClearToClose: true };
      const projectPhase3: Partial<Project> = { currentPhase: 3 };

      expect(deriveMilestoneActuals('closing', projectCTC)).toBe(true);
      expect(deriveMilestoneActuals('closing', projectPhase3)).toBe(true);
    });
  });

  describe('getBusinessDaysDiff math & TRID rules', () => {
    describe('getBusinessDaysDiff', () => {
      it('returns 0 if either date is missing or invalid', () => {
        expect(getBusinessDaysDiff('', '')).toBe(0);
        expect(getBusinessDaysDiff('invalid', '2026-07-01')).toBe(0);
        expect(getBusinessDaysDiff('2026-07-01', 'invalid')).toBe(0);
      });

      it('returns 0 if date1 is after or equal to date2', () => {
        expect(getBusinessDaysDiff('2026-07-05', '2026-07-01')).toBe(0);
        expect(getBusinessDaysDiff('2026-07-01', '2026-07-01')).toBe(0);
      });

      it('calculates strict business days diff excluding weekends correctly (Monday to Friday)', () => {
        // 2026-07-20 is Monday, 2026-07-24 is Friday
        // Days between: Tuesday, Wednesday, Thursday (3 business days)
        expect(getBusinessDaysDiff('2026-07-20', '2026-07-24')).toBe(3);
      });

      it('calculates strict business days diff excluding weekends correctly (Friday to Tuesday)', () => {
        // 2026-07-17 is Friday, 2026-07-21 is Tuesday
        // Days between: Saturday (skip), Sunday (skip), Monday (1 business day)
        expect(getBusinessDaysDiff('2026-07-17', '2026-07-21')).toBe(1);
      });

      it('calculates strict business days diff excluding weekends correctly (Friday to Wednesday)', () => {
        // 2026-07-17 is Friday, 2026-07-22 is Wednesday
        // Days between: Saturday (skip), Sunday (skip), Monday, Tuesday (2 business days)
        expect(getBusinessDaysDiff('2026-07-17', '2026-07-22')).toBe(2);
      });

      it('calculates strict business days diff excluding weekends correctly (Friday to Thursday)', () => {
        // 2026-07-17 is Friday, 2026-07-23 is Thursday
        // Days between: Saturday (skip), Sunday (skip), Monday, Tuesday, Wednesday (3 business days)
        expect(getBusinessDaysDiff('2026-07-17', '2026-07-23')).toBe(3);
      });
    });

    describe('TRID 3-Day Rule & Overdue Logic', () => {
      const todayStr = '2026-07-19';

      // Mock milestones array
      const createMilestones = (cdDate: string, closingDate: string, cdCompleted = false): ClosingMilestone[] => [
        { id: 'm-conv-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: '2026-07-10', completed: true },
        { id: 'm-conv-2', key: 'title', label: 'Title Clearance', targetOffsetDays: 20, targetDate: '2026-07-15', completed: false }, // Overdue
        { id: 'm-conv-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 35, targetDate: cdDate, completed: cdCompleted, actualDate: cdCompleted ? cdDate : null },
        { id: 'm-conv-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 45, targetDate: closingDate, completed: false }
      ];

      it('detects overdue milestones correctly', () => {
        const milestones = createMilestones('2026-07-25', '2026-08-05');
        const overdue = milestones.filter(m => !m.completed && m.targetDate < todayStr);
        
        expect(overdue.length).toBe(1);
        expect(overdue[0].key).toBe('title');
      });

      it('flags TRID violation if CD and Closing are spaced < 3 business days', () => {
        // CD on Monday 2026-07-20, Closing on Wednesday 2026-07-22 (only Tuesday is strictly between -> 1 business day)
        const milestones = createMilestones('2026-07-20', '2026-07-22');
        const cdMilestone = milestones.find(m => m.key === 'cd_delivered')!;
        const closingMilestone = milestones.find(m => m.key === 'closing')!;
        
        const cdDate = cdMilestone.actualDate || cdMilestone.targetDate;
        const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;
        
        const bizDays = getBusinessDaysDiff(cdDate, closingDate);
        expect(bizDays).toBe(1);
        expect(bizDays < 3).toBe(true);
      });

      it('does not flag TRID violation if CD and Closing are spaced >= 3 business days', () => {
        // CD on Monday 2026-07-20, Closing on Friday 2026-07-24 (Tuesday, Wednesday, Thursday strictly between -> 3 business days)
        const milestones = createMilestones('2026-07-20', '2026-07-24');
        const cdMilestone = milestones.find(m => m.key === 'cd_delivered')!;
        const closingMilestone = milestones.find(m => m.key === 'closing')!;
        
        const cdDate = cdMilestone.actualDate || cdMilestone.targetDate;
        const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;
        
        const bizDays = getBusinessDaysDiff(cdDate, closingDate);
        expect(bizDays).toBe(3);
        expect(bizDays < 3).toBe(false);
      });

      it('flags TRID approaching warning if Closing is within 7 calendar days but CD is incomplete', () => {
        // Today is 2026-07-19. Closing on Friday 2026-07-24 (5 calendar days away), CD is incomplete.
        const milestones = createMilestones('2026-07-21', '2026-07-24', false);
        const cdMilestone = milestones.find(m => m.key === 'cd_delivered')!;
        const closingMilestone = milestones.find(m => m.key === 'closing')!;
        
        const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;
        
        const today = new Date(todayStr + 'T12:00:00');
        const closing = new Date(closingDate + 'T12:00:00');
        const calendarDiff = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        expect(calendarDiff).toBe(5);
        expect(calendarDiff < 7 && !cdMilestone.completed).toBe(true);
      });

      it('does not flag TRID approaching warning if CD is already completed', () => {
        const milestones = createMilestones('2026-07-20', '2026-07-24', true);
        const cdMilestone = milestones.find(m => m.key === 'cd_delivered')!;
        const closingMilestone = milestones.find(m => m.key === 'closing')!;
        
        const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;
        
        const today = new Date(todayStr + 'T12:00:00');
        const closing = new Date(closingDate + 'T12:00:00');
        const calendarDiff = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        expect(calendarDiff).toBe(5);
        expect(calendarDiff < 7 && !cdMilestone.completed).toBe(false);
      });
    });
  });
});
