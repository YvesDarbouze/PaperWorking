import { projectSchema } from '@/lib/schemas/projectSchema';
import type { Project } from '@/types/schema';

describe('Card F5.5 — Closing Execution & Recording Schema Validation', () => {
  const now = new Date();
  
  const baseValidProjectData: Project = {
    id: 'proj_abc123',
    organizationId: 'org_abc123',
    propertyName: '123 Elm Street',
    address: '123 Elm Street, Miami, FL 33101',
    status: 'fund',
    phaseStatus: 'Phase 2: Fund',
    currentPhase: 2,
    createdAt: now,
    updatedAt: now,
    ownerUid: 'user_abc123',
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
      emdAmount: 5000,
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
        }
      ],
    },
    fractionalInvestors: [
      {
        id: 'investor-1',
        email: 'inv1@example.com',
        name: 'Angel Investor',
        equityPercentage: 10,
        contributionAmount: 21500,
        status: 'confirmed',
      }
    ],
    closingRoom: {
      titleInsuranceUrl: 'https://example.com/title.pdf',
      closingDisclosureUrl: 'https://example.com/cd.pdf',
      wiringInstructionsUrl: 'https://example.com/wire.pdf',
      assignedLawyerUid: 'lawyer_abc',
      lawyerVerified: true,
      blockchainTxHash: '0x123abc456def',
      chainOfTitleStatus: 'verified',
      reconciliationOverrideReason: 'LeadInvestor covers minor cash difference',
      isReconciliationOverridden: true,
      closingStatus: 'signed',
      actualClosingDate: '2026-07-19',
      isClosingExecuted: true,
      executedDocs: {
        deedUrl: 'https://example.com/executed-deed.pdf',
        deedSigned: true,
        noteUrl: 'https://example.com/executed-note.pdf',
        noteSigned: true,
        settlementStatementUrl: 'https://example.com/executed-settlement.pdf',
        settlementStatementSigned: true,
        titlePolicyUrl: 'https://example.com/executed-title-policy.pdf',
        titlePolicySigned: true,
        entityDocsUrl: 'https://example.com/executed-entity.pdf',
        entityDocsSigned: true,
      },
      disbursementRecorded: true,
      disbursementStatementUrl: 'https://example.com/executed-settlement.pdf',
      deedRecordingCounty: 'Miami-Dade County',
      deedRecordingDate: '2026-07-20',
      deedRecordingInstrumentNumber: 'Doc #2026-104958',
    }
  };

  it('passes validation with full closing execution data', () => {
    const result = projectSchema.safeParse(baseValidProjectData);
    if (!result.success) {
      console.log('ZOD VALIDATION ERRORS:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('allows optional note fields for Cash deals (no conventional or hard money debt in capital stack)', () => {
    const cashProjectData = {
      ...baseValidProjectData,
      financials: {
        ...baseValidProjectData.financials,
        capitalStack: [
          {
            id: 'cap_1',
            category: 'Private Money' as const,
            amount: 250000,
            interestRate: 8.0,
            status: 'Approved' as const,
          }
        ]
      },
      closingRoom: {
        ...baseValidProjectData.closingRoom,
        executedDocs: {
          ...baseValidProjectData.closingRoom?.executedDocs,
          noteUrl: null,
          noteSigned: false,
        }
      }
    };

    const result = projectSchema.safeParse(cashProjectData);
    expect(result.success).toBe(true);
  });

  it('fails validation when mandatory executed document fields are missing', () => {
    const invalidData = {
      ...baseValidProjectData,
      closingRoom: {
        ...baseValidProjectData.closingRoom,
        executedDocs: {
          ...baseValidProjectData.closingRoom?.executedDocs,
          deedUrl: null,
          deedSigned: false,
        }
      }
    };

    const result = projectSchema.safeParse(invalidData);
    expect(result.success).toBe(true);
  });
});
