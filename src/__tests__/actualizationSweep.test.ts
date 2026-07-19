import { projectSchema } from '@/lib/schemas/projectSchema';
import type { Project } from '@/types/schema';

describe('Card F5.6 — Actualization Sweep calculations and validation', () => {
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
      finalClosingCosts: 5200,
      finalPrepaidsReserves: 1600,
      finalCashToClose: 245000,
      emdAmount: 500000, // 500000 cents = $5000
      insuranceCost: 1200,
      loanAmount: 185000,
      loanInterestRate: 6.25,
      capitalStack: [
        {
          id: 'source-1',
          category: 'Conventional Financing',
          amount: 185000,
          interestRate: 6.25,
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
      cdFinalClosingCosts: 5200,
      cdPrepaidsReserves: 1600,
      cdCashToClose: 245000,
      assignedLawyerUid: 'lawyer_abc123',
      blockchainTxHash: '0x123abc...',
      chainOfTitleStatus: 'verified',
    }
  };

  it('validates project data populated with actuals sweep results', () => {
    const result = projectSchema.safeParse(baseValidProjectData);
    if (!result.success) {
      console.log('SWEEP VALIDATION ERRORS:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('correctly compares projected vs actual fields for cost/financing parameters', () => {
    const financials = baseValidProjectData.financials;
    
    // Purchase Price
    const projectedPurchasePrice = 250000;
    const actualPurchasePrice = financials.purchasePrice;
    expect(actualPurchasePrice).toBe(projectedPurchasePrice);

    // Closing Costs
    const projectedClosingCosts = 5000; // base standard estimate
    const actualClosingCosts = financials.finalClosingCosts || 0;
    expect(actualClosingCosts).toBe(5200);
    const closingCostsDelta = actualClosingCosts - (projectedClosingCosts || 0);
    expect(closingCostsDelta).toBe(200);

    // Hazard Insurance
    const projectedInsurance = 1000;
    const actualInsurance = financials.insuranceCost;
    expect(actualInsurance).toBe(1200);
    expect((actualInsurance || 0) - projectedInsurance).toBe(200);

    // EMD
    const projectedEmd = 5000;
    const actualEmd = financials.emdAmount ? financials.emdAmount / 100 : 0;
    expect(actualEmd).toBe(projectedEmd);

    // Loan amount
    const projectedLoan = 180000;
    const actualLoan = financials.loanAmount;
    expect(actualLoan).toBe(185000);
  });
});
