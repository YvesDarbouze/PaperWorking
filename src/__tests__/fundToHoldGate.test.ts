import { evaluateF6GateLines } from '@/lib/gates/fundGateLines';
import type { Project } from '@/types/schema';

describe('Column F6 — Fund → Hold Phase Gate Checklist Validation', () => {
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
        },
        {
          id: 'equity-1',
          category: 'Private Money',
          amount: 98900,
          interestRate: 0,
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
    const lines = evaluateF6GateLines(fullyValidFundProject, ['NY', 'GA', 'MA']);
    
    // Check all lines are satisfied (not blocked)
    lines.forEach(line => {
      expect(line.blocked).toBe(false);
    });
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

    const lines = evaluateF6GateLines(incompleteProject, ['NY', 'GA', 'MA']);
    
    const purchasePriceLine = lines.find(l => l.key === 'purchasePrice');
    const totalCashLine = lines.find(l => l.key === 'totalCash');
    const closingDateLine = lines.find(l => l.key === 'closingDate');
    const deedRecordingLine = lines.find(l => l.key === 'deedRecording');

    expect(purchasePriceLine?.blocked).toBe(true);
    expect(totalCashLine?.blocked).toBe(true);
    expect(closingDateLine?.blocked).toBe(true);
    expect(deedRecordingLine?.blocked).toBe(true);
  });
});
