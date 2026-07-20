import { calculateCapitalStack } from '@/lib/metrics/reiMetrics';

describe('Capital Stack Composer Math Engine', () => {
  const projectBase = {
    financials: {
      purchasePrice: 200000,
      closingCosts: 10000,
      projectedRehabCost: 30000,
      capitalStack: [
        { id: '1', category: 'Private Money', amount: 50000, status: 'Approved' },
        { id: '2', category: 'Conventional Financing', amount: 100000, status: 'Approved' },
        { id: '3', category: 'Hard Money Loans', amount: 40000, status: 'Approved' },
        { id: '4', category: 'Bridge Loans', amount: 10000, status: 'Exploring' }, // Status exploring, should not count towards totalFunded
      ]
    }
  };

  it('correctly derives total project cost', () => {
    const res = calculateCapitalStack(projectBase);
    expect(res.totalProjectCost).toBe(240000); // 200k + 10k + 30k
  });

  it('calculates total funded and gap with approved/funded status only', () => {
    const res = calculateCapitalStack(projectBase);
    expect(res.totalFunded).toBe(190000); // 50k + 100k + 40k
    expect(res.gap).toBe(50000); // 240k - 190k
    expect(res.percentFunded).toBeCloseTo((190000 / 240000) * 100);
    expect(res.percentGap).toBeCloseTo((50000 / 240000) * 100);
  });

  it('sorts sources by seniority: senior debt -> junior debt -> equity', () => {
    const res = calculateCapitalStack(projectBase);
    const categories = res.sources.map(s => s.category);
    expect(categories).toEqual([
      'Conventional Financing',
      'Hard Money Loans',
      'Bridge Loans',
      'Private Money'
    ]);
  });

  it('validates standard SBA 504 structure (50/40/10)', () => {
    const sbaProject = {
      fundingPlan: {
        modality: ['sba_504']
      },
      financials: {
        purchasePrice: 100000,
        closingCosts: 0,
        projectedRehabCost: 0,
        sbaLoanStructure: {
          type: 'standard'
        },
        capitalStack: [
          { id: '1', category: 'SBA 504 Bank First Lien', amount: 50000, status: 'Approved' },
          { id: '2', category: 'SBA 504 CDC Debenture', amount: 40000, status: 'Approved' },
          { id: '3', category: 'Borrower Injection', amount: 10000, status: 'Approved' }
        ]
      }
    };

    const res = calculateCapitalStack(sbaProject);
    expect(res.sbaValidation).toBeDefined();
    expect(res.sbaValidation?.isValid).toBe(true);
    expect(res.sbaValidation?.actualBankPct).toBe(50);
    expect(res.sbaValidation?.actualCdcPct).toBe(40);
    expect(res.sbaValidation?.actualBorrowerPct).toBe(10);
  });

  it('validates special-purpose SBA 504 structure (50/35/15)', () => {
    const sbaProject = {
      fundingPlan: {
        modality: ['sba_504']
      },
      financials: {
        purchasePrice: 100000,
        closingCosts: 0,
        projectedRehabCost: 0,
        sbaLoanStructure: {
          type: 'special_purpose'
        },
        capitalStack: [
          { id: '1', category: 'SBA 504 Bank First Lien', amount: 50000, status: 'Approved' },
          { id: '2', category: 'SBA 504 CDC Debenture', amount: 35000, status: 'Approved' },
          { id: '3', category: 'Borrower Injection', amount: 15000, status: 'Approved' }
        ]
      }
    };

    const res = calculateCapitalStack(sbaProject);
    expect(res.sbaValidation).toBeDefined();
    expect(res.sbaValidation?.isValid).toBe(true);
    expect(res.sbaValidation?.actualBankPct).toBe(50);
    expect(res.sbaValidation?.actualCdcPct).toBe(35);
    expect(res.sbaValidation?.actualBorrowerPct).toBe(15);
  });

  it('validates dual-condition SBA 504 structure (50/30/20)', () => {
    const sbaProject = {
      fundingPlan: {
        modality: ['sba_504']
      },
      financials: {
        purchasePrice: 100000,
        closingCosts: 0,
        projectedRehabCost: 0,
        sbaLoanStructure: {
          type: 'dual_condition'
        },
        capitalStack: [
          { id: '1', category: 'SBA 504 Bank First Lien', amount: 50000, status: 'Approved' },
          { id: '2', category: 'SBA 504 CDC Debenture', amount: 30000, status: 'Approved' },
          { id: '3', category: 'Borrower Injection', amount: 20000, status: 'Approved' }
        ]
      }
    };

    const res = calculateCapitalStack(sbaProject);
    expect(res.sbaValidation).toBeDefined();
    expect(res.sbaValidation?.isValid).toBe(true);
    expect(res.sbaValidation?.actualBankPct).toBe(50);
    expect(res.sbaValidation?.actualCdcPct).toBe(30);
    expect(res.sbaValidation?.actualBorrowerPct).toBe(20);
  });

  it('fails validation when SBA 504 structure is incorrect', () => {
    const sbaProject = {
      fundingPlan: {
        modality: ['sba_504']
      },
      financials: {
        purchasePrice: 100000,
        closingCosts: 0,
        projectedRehabCost: 0,
        sbaLoanStructure: {
          type: 'standard'
        },
        capitalStack: [
          { id: '1', category: 'SBA 504 Bank First Lien', amount: 60000, status: 'Approved' }, // Should be 50k
          { id: '2', category: 'SBA 504 CDC Debenture', amount: 30000, status: 'Approved' }, // Should be 40k
          { id: '3', category: 'Borrower Injection', amount: 10000, status: 'Approved' }
        ]
      }
    };

    const res = calculateCapitalStack(sbaProject);
    expect(res.sbaValidation).toBeDefined();
    expect(res.sbaValidation?.isValid).toBe(false);
  });
});
