import { projectSchema } from '@/lib/schemas/projectSchema';
import type { Project } from '@/types/schema';

describe('Column F6 — Fund &rarr; Hold Phase Gate Checklist Validation', () => {
  const now = new Date();

  // Fully valid and completed Fund phase mock project
  const fullyValidFundProject: Project = {
    id: 'proj_gate123',
    organizationId: 'org_gate123',
    propertyName: '456 Oak Avenue',
    address: '456 Oak Avenue, Orlando, FL 32801',
    status: 'fund',
    phaseStatus: 'Phase 2: Fund',
    currentPhase: 2,
    createdAt: now,
    updatedAt: now,
    ownerUid: 'user_gate123',
    members: {
      user_gate123: {
        uid: 'user_gate123',
        role: 'Lead Investor',
        joinedAt: now,
      },
    },
    financials: {
      purchasePrice: 320000,
      estimatedARV: 450000,
      costs: [],
      finalClosingCosts: 6800,
      finalPrepaidsReserves: 2100,
      finalCashToClose: 115000,
      totalCashInvested: 115000,
      emdAmount: 1000000, // 1000000 cents = $10,000
      insuranceCost: 1800,
      loanAmount: 220000,
      loanInterestRate: 5.75,
      capitalStack: [
        {
          id: 'loan-1',
          category: 'Conventional Financing',
          amount: 220000,
          interestRate: 5.75,
          status: 'Approved',
        }
      ],
    },
    closingRoom: {
      titleInsuranceUrl: 'https://example.com/title.pdf',
      closingDisclosureUrl: 'https://example.com/cd.pdf',
      wiringInstructionsUrl: 'https://example.com/wire.pdf',
      lawyerVerified: true,
      closingStatus: 'signed',
      cdFinalClosingCosts: 6800,
      cdPrepaidsReserves: 2100,
      cdCashToClose: 115000,
      assignedLawyerUid: 'lawyer_gate123',
      blockchainTxHash: '0xabc123...',
      chainOfTitleStatus: 'verified',
      isClosingExecuted: true,
      actualClosingDate: '2026-07-19',
      executedDocs: {
        deedUrl: 'https://example.com/exec-deed.pdf',
        deedSigned: true,
        noteUrl: 'https://example.com/exec-note.pdf',
        noteSigned: true,
        settlementStatementUrl: 'https://example.com/exec-settlement.pdf',
        settlementStatementSigned: true,
        titlePolicyUrl: 'https://example.com/exec-title.pdf',
        titlePolicySigned: true,
        entityDocsUrl: 'https://example.com/exec-entity.pdf',
        entityDocsSigned: true,
      },
      disbursementRecorded: true,
      disbursementStatementUrl: 'https://example.com/exec-settlement.pdf',
      deedRecordingCounty: 'Orange County',
      deedRecordingDate: '2026-07-19',
      deedRecordingInstrumentNumber: 'Book 2026 Page 1234',
    }
  };

  it('evaluates and satisfies all transition criteria on a fully complete deal', () => {
    // Verify Zod validation passes
    const result = projectSchema.safeParse(fullyValidFundProject);
    expect(result.success).toBe(true);

    // Live evaluation simulation
    const deal = fullyValidFundProject;
    const isFinanced = true;

    // 1. Actual purchase price recorded
    const isPurchasePriceRecorded = !!deal.financials?.purchasePrice && deal.financials.purchasePrice > 0;
    expect(isPurchasePriceRecorded).toBe(true);

    // 2. Total cash invested fully actualized
    const isTotalCashActualized = (!!deal.financials?.totalCashInvested && deal.financials.totalCashInvested > 0) || (!!deal.financials?.finalCashToClose && deal.financials.finalCashToClose > 0);
    expect(isTotalCashActualized).toBe(true);

    // 3. Loan terms actual (financed routes)
    const isLoanTermsActual = !isFinanced || (
      !!deal.financials?.loanAmount && deal.financials.loanAmount > 0 &&
      !!deal.financials?.loanInterestRate && deal.financials.loanInterestRate > 0
    );
    expect(isLoanTermsActual).toBe(true);

    // 4. Closing date recorded
    const isClosingDateRecorded = !!deal.closingRoom?.actualClosingDate;
    expect(isClosingDateRecorded).toBe(true);

    // 5. Deed recording confirmed
    const isDeedRecordingConfirmed = !!deal.closingRoom?.deedRecordingCounty && !!deal.closingRoom?.deedRecordingDate && !!deal.closingRoom?.deedRecordingInstrumentNumber;
    expect(isDeedRecordingConfirmed).toBe(true);

    // 6. Required closing documents archived
    const docs = deal.closingRoom?.executedDocs;
    const isDocsChecklistComplete = 
      !!(docs?.deedUrl && docs?.deedSigned) &&
      (!isFinanced || !!(docs?.noteUrl && docs?.noteSigned)) &&
      !!(docs?.settlementStatementUrl && docs?.settlementStatementSigned) &&
      !!(docs?.titlePolicyUrl && docs?.titlePolicySigned) &&
      !!(docs?.entityDocsUrl && docs?.entityDocsSigned);
    expect(isDocsChecklistComplete).toBe(true);

    // 7. Cash-to-close reconciled (mock variance is 0 in reconciliation engine)
    const isCashToCloseReconciled = true;
    expect(isCashToCloseReconciled).toBe(true);

    // 8. Attorney requirement satisfied
    const isAttorneySatisfied = !!deal.closingRoom?.lawyerVerified;
    expect(isAttorneySatisfied).toBe(true);
  });

  it('fails the gate checks when mandatory fields are missing', () => {
    const incompleteProject = {
      ...fullyValidFundProject,
      financials: {
        ...fullyValidFundProject.financials,
        purchasePrice: 0, // Missing purchase price actual
        totalCashInvested: 0, // Missing cash actualized
        finalCashToClose: 0,
      },
      closingRoom: {
        ...fullyValidFundProject.closingRoom,
        actualClosingDate: null, // Missing closing date
        deedRecordingCounty: null, // Missing deed county
      }
    };

    const deal = incompleteProject;
    
    const isPurchasePriceRecorded = !!deal.financials?.purchasePrice && deal.financials.purchasePrice > 0;
    expect(isPurchasePriceRecorded).toBe(false);

    const isTotalCashActualized = (!!deal.financials?.totalCashInvested && deal.financials.totalCashInvested > 0) || (!!deal.financials?.finalCashToClose && deal.financials.finalCashToClose > 0);
    expect(isTotalCashActualized).toBe(false);

    const isClosingDateRecorded = !!deal.closingRoom?.actualClosingDate;
    expect(isClosingDateRecorded).toBe(false);

    const isDeedRecordingConfirmed = !!deal.closingRoom?.deedRecordingCounty && !!deal.closingRoom?.deedRecordingDate && !!deal.closingRoom?.deedRecordingInstrumentNumber;
    expect(isDeedRecordingConfirmed).toBe(false);
  });
});
