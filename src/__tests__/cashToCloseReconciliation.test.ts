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
      reconciliationOverrideReason: 'LeadInvestor covers minor cash difference',
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

    it('FX-8: verifies cash-to-close reconciliation matching the FX-1 property scenario', () => {
      const fx8Project: Project = {
        ...validBaseProject,
        financials: {
          ...validBaseProject.financials,
          purchasePrice: 279000,
          finalClosingCosts: 4200, // from DEMO_FINANCIALS
          finalPrepaidsReserves: 800,
          emdAmount: 500000, // $5,000 earnest money deposited in Acquisition
          capitalStack: [
            {
              id: 'loan-1',
              category: 'Hard Money Loans',
              amount: 223200, // 80% loan
              interestRate: 6.5,
              status: 'Approved',
            },
            {
              id: 'equity-1',
              category: 'Private Money',
              amount: 55800, // 20% down payment
              interestRate: 0,
              status: 'Approved',
            }
          ]
        },
        fractionalInvestors: [],
      };

      const result = reconcileProjectCapital(fx8Project);

      expect(result.purchasePrice).toBe(279000);
      expect(result.closingCosts).toBe(4200);
      expect(result.prepaidsReserves).toBe(800);
      expect(result.totalUses).toBe(284000);

      expect(result.earnestMoneyCredit).toBe(5000);
      expect(result.lockedDebt).toBe(223200);
      expect(result.confirmedEquity).toBe(55800);
      expect(result.totalSources).toBe(284000);

      expect(result.variance).toBe(0);
      expect(result.isReconciled).toBe(true);
    });

    it('falls back to projected closing costs and prepaids/reserves when final values are not set', () => {
      const projectWithoutFinals: Project = {
        ...validBaseProject,
        financials: {
          ...validBaseProject.financials,
          purchasePrice: 250000,
          closingCosts: 4500,
          finalClosingCosts: undefined,
          finalPrepaidsReserves: undefined,
        }
      };

      const result = reconcileProjectCapital(projectWithoutFinals);
      
      expect(result.closingCosts).toBe(4500); // fell back to projected closingCosts
      expect(result.prepaidsReserves).toBe(885); // fell back to formula-derived projected prepaids
    });

    it('handles all debt and equity categories in the capital stack correctly', () => {
      const complexStackProject: Project = {
        ...validBaseProject,
        financials: {
          ...validBaseProject.financials,
          capitalStack: [
            { id: '1', category: 'SBA 504 Bank First Lien', amount: 125000, interestRate: 6, status: 'Approved' },
            { id: '2', category: 'SBA 504 CDC Debenture', amount: 100000, interestRate: 5.5, status: 'Approved' },
            { id: '3', category: 'GP Co-investment', amount: 10000, interestRate: 0, status: 'Approved' },
            { id: '4', category: 'Borrower Injection', amount: 15000, interestRate: 0, status: 'Approved' },
            { id: '5', category: 'Bridge Loans', amount: 20000, interestRate: 8, status: 'Approved' },
            { id: '6', category: 'Syndication Equity', amount: 30000, interestRate: 0, status: 'Approved' },
          ]
        },
        fractionalInvestors: []
      };

      const result = reconcileProjectCapital(complexStackProject);

      expect(result.lockedDebt).toBe(245000);
      expect(result.confirmedEquity).toBe(55000);
    });
  });

  describe('Zod Schema Verification', () => {
    it('successfully parses project metadata with the new override reason fields', () => {
      const parseResult = projectSchema.safeParse(validBaseProject);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.closingRoom?.reconciliationOverrideReason).toBe('LeadInvestor covers minor cash difference');
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
