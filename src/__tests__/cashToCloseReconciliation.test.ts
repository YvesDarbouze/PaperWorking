import { projectSchema } from '@/lib/schemas/projectSchema';
import { reconcileProjectCapital } from '@/lib/math/reconciliation';
import type { Project } from '@/types/schema';

describe('Card F5.4 — Cash-to-Close Reconciliation Engine & Schema', () => {
  const now = new Date();
  
  const validBaseProject: Project = {
    id: 'proj_abc123',
    organizationId: 'org_abc123',
    propertyName: '123 Elm Street',
    address: '123 Elm Street, Miami, FL 33101',
    status: 'acquisition',
    members: {
      user_abc123: {
        uid: 'user_abc123',
        role: 'Lead Investor',
        joinedAt: now,
      },
    },
    financials: {
      purchasePrice: 250000,
      estimatedARV: 350000,
      costs: [],
      finalClosingCosts: 5000,
      finalPrepaidsReserves: 1500,
      emdAmount: 500000, // $5,000 earnest money
      capitalStack: [
        {
          id: 'source-1',
          category: 'Conventional Financing',
          amount: 180000,
          interestRate: 6.5,
          status: 'Approved',
        },
        {
          id: 'source-2',
          category: 'Private Money',
          amount: 50000,
          interestRate: 8.0,
          status: 'Approved',
        },
        {
          id: 'source-3',
          category: 'Hard Money Loans',
          amount: 20000,
          interestRate: 10.0,
          status: 'Exploring', // Should be excluded since status is not Approved/Funded
        }
      ],
    },
    fractionalInvestors: [
      {
        id: 'investor-1',
        email: 'inv1@example.com',
        name: 'Angel Investor',
        equityPercentage: 10,
        contributionAmount: 21500, // Confirmed Equity
        status: 'confirmed',
      },
      {
        id: 'investor-2',
        email: 'inv2@example.com',
        name: 'Pending Investor',
        equityPercentage: 5,
        contributionAmount: 10000,
        status: 'invited', // Should be excluded
      }
    ],
    closingRoom: {
      titleInsuranceUrl: 'https://example.com/title.pdf',
      closingDisclosureUrl: 'https://example.com/cd.pdf',
      wiringInstructionsUrl: 'https://example.com/wire.pdf',
      assignedLawyerUid: 'lawyer_abc',
      lawyerVerified: true,
      blockchainTxHash: '0x123',
      chainOfTitleStatus: 'verified',
      reconciliationOverrideReason: 'Sponsor covers minor cash difference',
      isReconciliationOverridden: true,
    },
    ownerUid: 'user_abc123',
    createdAt: now,
    updatedAt: now,
  };

  describe('Reconciliation Math Engine', () => {
    it('calculates balanced uses and sources correctly (reconciled)', () => {
      // Uses = 250,000 (price) + 5,000 (closing costs) + 1,500 (prepaids) = 256,500
      // Sources = 5,000 (EMD) + 180,000 (Approved conventional debt) + 50,000 (Approved private equity) + 21,500 (Confirmed fractional equity) = 256,500
      // Variance = 0
      const result = reconcileProjectCapital(validBaseProject);
      
      expect(result.totalUses).toBe(256500);
      expect(result.earnestMoneyCredit).toBe(5000);
      expect(result.lockedDebt).toBe(180000);
      expect(result.confirmedEquity).toBe(71500); // 50,000 private + 21,500 fractional
      expect(result.totalSources).toBe(256500);
      expect(result.variance).toBe(0);
      expect(result.isReconciled).toBe(true);
      expect(result.isOver).toBe(false);
      expect(result.isUnder).toBe(false);
    });

    it('calculates an underfunded variance correctly', () => {
      const projectUnderfunded = {
        ...validBaseProject,
        financials: {
          ...validBaseProject.financials,
          purchasePrice: 260000, // Uses rise by 10,000
        }
      };

      const result = reconcileProjectCapital(projectUnderfunded);
      expect(result.totalUses).toBe(266500);
      expect(result.totalSources).toBe(256500);
      expect(result.variance).toBe(-10000);
      expect(result.isReconciled).toBe(false);
      expect(result.isUnder).toBe(true);
    });

    it('calculates an overfunded variance correctly', () => {
      const projectOverfunded = {
        ...validBaseProject,
        financials: {
          ...validBaseProject.financials,
          emdAmount: 700000, // EMD rises by 2,000 ($7,000 total EMD)
        }
      };

      const result = reconcileProjectCapital(projectOverfunded);
      expect(result.totalUses).toBe(256500);
      expect(result.totalSources).toBe(258500);
      expect(result.variance).toBe(2000);
      expect(result.isReconciled).toBe(false);
      expect(result.isOver).toBe(true);
    });
  });

  describe('Zod Schema Verification', () => {
    it('successfully parses project metadata with the new override reason fields', () => {
      const parseResult = projectSchema.safeParse(validBaseProject);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.closingRoom?.reconciliationOverrideReason).toBe('Sponsor covers minor cash difference');
        expect(parseResult.data.closingRoom?.isReconciliationOverridden).toBe(true);
      }
    });

    it('rejects invalid types for reconciliation override fields', () => {
      const invalidProject = {
        ...validBaseProject,
        closingRoom: {
          ...validBaseProject.closingRoom,
          isReconciliationOverridden: 'not-a-boolean', // Should be boolean
        }
      };

      const parseResult = projectSchema.safeParse(invalidProject);
      expect(parseResult.success).toBe(false);
    });
  });
});
