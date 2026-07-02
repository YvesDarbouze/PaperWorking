/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import {
  usePortfolioInsights,
  generateAmortizationSchedule,
  calculate10YearProForma,
} from "../usePortfolioInsights";
import type { Project } from "@/types/schema";

// Mock the project store
const mockProjects: Project[] = [
  {
    id: "p1",
    organizationId: "org-1",
    propertyName: "Stabilized Rental",
    strategyType: "Rent",
    currentPhase: 4,
    status: "Rented",
    address: "123 Main St",
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerUid: "user-1",
    members: {},
    financials: {
      purchasePrice: 400000,
      estimatedARV: 420000,
      estimatedCurrentValue: 420000,
      loanAmount: 300000,
      loanInterestRate: 6,
      loanTermYears: 30,
      monthlyGrossRent: 3000,
      holdingCostTaxes: 300,
      holdingCostInsurance: 150,
      holdingCostUtilities: 100,
      vacancyRatePercent: 5,
      costs: [],
      annualRentGrowthPercent: 3,
      annualAppreciationPercent: 4,
    },
  },
  {
    id: "p2",
    organizationId: "org-1",
    propertyName: "Active Flip Asset",
    strategyType: "Fix & Flip",
    currentPhase: 2,
    status: "Renovating",
    address: "456 Oak Ave",
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerUid: "user-1",
    members: {},
    financials: {
      purchasePrice: 200000,
      estimatedARV: 300000,
      projectedRehabCost: 50000,
      fixedAcquisitionCosts: 5000,
      costs: [],
    },
  },
];

jest.mock("@/store/projectStore", () => ({
  useProjectStore: (selector: any) => selector({ projects: mockProjects }),
}));

describe("Amortization Schedule Calculations", () => {
  it("generates a monthly amortization schedule correctly", () => {
    // 30 years = 360 months
    const schedule = generateAmortizationSchedule(300000, 6, 360);
    expect(schedule.length).toBe(360);
    
    // First month checks
    const first = schedule[0];
    expect(first.month).toBe(1);
    // Interest = 300000 * 6% / 12 = 1500
    expect(first.interest).toBe(1500);
    // Payment = P * r * (1+r)^n / ((1+r)^n - 1) approx 1798.65
    expect(first.payment).toBeCloseTo(1798.65, 1);
    expect(first.principal).toBeCloseTo(1798.65 - 1500, 1);
    
    // Final month balance is exactly 0.00
    const final = schedule[359];
    expect(final.remainingBalance).toBe(0);
    expect(final.principal).toBeCloseTo(final.payment - final.interest, 1);
  });

  it("applies Amortization Drift Reconciliation Guard on the final month", () => {
    // Check that outstanding balance is exactly zero after the final month adjustment
    const schedule = generateAmortizationSchedule(100000, 5.5, 120); // 10 year loan
    expect(schedule.length).toBe(120);
    expect(schedule[119].remainingBalance).toBe(0);
  });
});

describe("calculate10YearProForma", () => {
  it("projects rentals over 10 years with standard growth rules", () => {
    const p1 = mockProjects[0];
    const proForma = calculate10YearProForma(p1);
    expect(proForma.length).toBe(10);
    
    // Year 1 NOI calculation:
    // Rental = 3000 * 12 = 36000
    // Vacancy = 36000 * 5% = 1800
    // EGI = 36000 - 1800 = 34200
    // OpEx = (300 + 150 + 100) * 12 = 550 * 12 = 6600
    // NOI = 34200 - 6600 = 27600
    expect(proForma[0].noi).toBeCloseTo(27600, 1);
    expect(proForma[0].egi).toBeCloseTo(34200, 1);
    
    // Year 2 should escalate rent by 3% and expenses by 2.5%
    // Rent = 36000 * 1.03 = 37080
    // Vacancy = 37080 * 5% = 1854
    // EGI = 37080 - 1854 = 35226
    // OpEx = 6600 * 1.025 = 6765
    // NOI = 35226 - 6765 = 28461
    expect(proForma[1].egi).toBeCloseTo(35226, 1);
    expect(proForma[1].opex).toBeCloseTo(6765, 1);
    expect(proForma[1].noi).toBeCloseTo(28461, 1);
  });

  it("applies stress parameters overrides in real time", () => {
    const p1 = mockProjects[0];
    const stressParams = {
      vacancyRate: 10,
      interestRateSpike: 1.5,
      opexOverrun: 20,
      taxReassessment: 15,
      rentGrowthOverride: 0,
      expenseGrowthOverride: 3.0,
    };
    
    const proForma = calculate10YearProForma(p1, stressParams);
    
    // Vacancy should now be 10% instead of 5%
    // EGI = 36000 - 3600 = 32400
    expect(proForma[0].egi).toBeCloseTo(32400, 1);
    
    // Tax spike + opex overrun should increase opex:
    // Base Tax = 300 * 12 = 3600. Reassessed (+15%) = 4140
    // Base Other OpEx = (150 + 100) * 12 = 3000
    // Total Base with Tax = 7140
    // Overrun (+20%) = 7140 * 1.2 = 8568
    expect(proForma[0].opex).toBeCloseTo(8568, 1);
    
    // NOI = 32400 - 8568 = 23832
    expect(proForma[0].noi).toBeCloseTo(23832, 1);
  });
});

describe("usePortfolioInsights Hook", () => {
  it("filters stabilized vs working capital projects", () => {
    const { result } = renderHook(() => usePortfolioInsights(mockProjects));
    
    expect(result.current.stabilizedProjects.length).toBe(1);
    expect(result.current.stabilizedProjects[0].id).toBe("p1");
    
    expect(result.current.workingCapitalProjects.length).toBe(1);
    expect(result.current.workingCapitalProjects[0].id).toBe("p2");
    
    // Portfolio rollup should reflect only stabilized rental assets
    // NOI = 27600
    expect(result.current.portfolioRollup.totalNOI).toBeCloseTo(27600, 1);
  });
});
