import { 
  derivePropertyFinancials, 
  deriveOperationalData, 
  deriveMarketPortfolio 
} from '../components/dashboard/charts/LifecycleMetricsDashboard';
import { deriveNOIBreakdowns } from '../components/dashboard/charts/NOIDeepDive';
import { Project } from '@/types/schema';

describe('LifecycleMetricsDashboard Aggregation Logic', () => {
  const mockProjects: Partial<Project>[] = [
    {
      id: 'p1',
      propertyName: 'Alpha Estate',
      financials: {
        purchasePrice: 100000,
        estimatedARV: 150000,
        projectedMonthlyRent: 1500,
        loanAmount: 80000,
        loanInterestRate: 7,
        costs: [],
        // No explicit expense fields -> NOI = rent * 12 - vacancyLoss(7%)
        // = 18000 - 1260 = 16740
      }
    },
    {
      id: 'p2',
      propertyName: 'Beta Complex',
      financials: {
        purchasePrice: 200000,
        estimatedARV: 250000,
        projectedMonthlyRent: 2000,
        loanAmount: 180000,
        loanInterestRate: 7,
        costs: [],
        // NOI = 24000 - 1680(vacancy @7%) = 22320
      }
    }
  ];

  it('derivePropertyFinancials uses real metrics engine (not 50% rule)', () => {
    const data = derivePropertyFinancials(mockProjects as Project[]);
    expect(data.length).toBe(2);
    
    // Project 1: NOI from computeNOIComponents
    // GrossRentalIncome = 1500 * 12 = 18000
    // Vacancy @7% default = 1260
    // No other expenses set -> NOI = 18000 - 1260 = 16740
    expect(data[0].NOI).toBe(16740);
    expect(data[0].name).toBe('Alpha Esta'); // 10 char substring
    // CapRate = computeCapRate(16740, 100000) = 16.74 (uses purchasePrice first)
    expect(data[0].CapRate).toBeCloseTo(16.74, 1);
    // DSCR should be > 0 since we have a loan
    expect(data[0].DSCR).toBeGreaterThan(0);
  });

  it('derivePropertyFinancials handles projects with no financials', () => {
    const projects = [{ id: 'empty', propertyName: 'Empty' }] as Project[];
    const data = derivePropertyFinancials(projects);
    expect(data[0].NOI).toBe(0);
    expect(data[0].CapRate).toBe(0);
    expect(data[0].DSCR).toBe(0);
  });

  it('deriveOperationalData produces 4 quarters', () => {
    const data = deriveOperationalData(mockProjects as Project[]);
    expect(data.length).toBe(4);
    expect(data[0].quarter).toBe('Q1');
    expect(data[3].quarter).toBe('Q4');
    // Occupancy should always be between 0 and 100
    data.forEach(q => {
      expect(q.Occupancy).toBeGreaterThanOrEqual(0);
      expect(q.Occupancy).toBeLessThanOrEqual(100);
    });
  });

  it('deriveOperationalData falls back to synthetic data for empty projects', () => {
    const data = deriveOperationalData([]);
    expect(data.length).toBe(4);
    // Falls back to synthetic with baseOcc = 85 + 2 = 87
    expect(data[0].Occupancy).toBe(83);
  });

  it('deriveMarketPortfolio calculates LTV correctly', () => {
    const data = deriveMarketPortfolio(mockProjects as Project[]);
    // Total Value: 150000 + 250000 = 400000
    // Total Debt: 80000 + 180000 = 260000
    // LTV = 260000 / 400000 * 100 = 65
    // Equity = 100 - 65 = 35

    expect(data[0].name).toBe('Debt (LTV)');
    expect(data[0].value).toBe(65);

    expect(data[1].name).toBe('Equity');
    expect(data[1].value).toBe(35);
  });

  it('deriveMarketPortfolio handles empty projects gracefully', () => {
    const data = deriveMarketPortfolio([]);
    expect(data[0].name).toBe('No Data');
    expect(data[0].value).toBe(100);
  });
});

describe('NOIDeepDive Breakdown Logic', () => {
  const mockWithExpenses: Partial<Project>[] = [
    {
      id: 'rental1',
      propertyName: 'The $279K Rental',
      address: '123 Main St',
      financials: {
        purchasePrice: 279000,
        estimatedARV: 300000,
        costs: [],
        monthlyGrossRent: 1950,         // $1,950/mo = $23,400/yr
        vacancyRatePercent: 7,           // $1,638/yr
        monthlyMaintenanceReserve: 195,  // 10% of rent ≈ $2,340/yr
        propertyManagementFeePercent: 10,// ≈ $2,340/yr
        holdingCostTaxes: 200,           // $2,400/yr
        holdingCostInsurance: 58,        // $696/yr
        holdingCostUtilities: 125,       // $1,500/yr
      }
    }
  ];

  it('computes NOI matching the $279K real-world example', () => {
    const breakdowns = deriveNOIBreakdowns(mockWithExpenses as Project[]);
    expect(breakdowns.length).toBe(1);

    const b = breakdowns[0];
    const c = b.components;

    // Gross Rental Income = 1950 * 12 = 23400
    expect(c.grossRentalIncome).toBe(23400);

    // Vacancy Loss = 23400 * 0.07 = 1638
    expect(c.vacancyLoss).toBeCloseTo(1638, 0);

    // Mgmt: 23400 * 0.10 = 2340, Maint: 195*12=2340
    expect(c.propertyTaxes).toBe(2400);
    expect(c.insurance).toBe(696);
    expect(c.utilities).toBe(1500);
    expect(c.propertyManagement).toBeCloseTo(2340, 2);
    expect(c.maintenance).toBe(2340);

    // Total OpEx = 2400+696+1500+2340+2340 = 9276
    expect(c.totalOperatingExpenses).toBe(9276);

    // NOI = 21762 - 9276 = 12486
    expect(c.noi).toBeCloseTo(12486, 0);
  });

  it('50% Rule estimate is lower than calculated NOI for the example property', () => {
    const breakdowns = deriveNOIBreakdowns(mockWithExpenses as Project[]);
    const b = breakdowns[0];

    // 50% Rule: 23400 / 2 = 11700
    expect(b.fiftyPercentEstimate).toBe(11700);

    // Our calculated NOI (12486) beats the 50% rule (11700)
    expect(b.components.noi).toBeGreaterThan(b.fiftyPercentEstimate);
    expect(b.noiDelta).toBeGreaterThan(0);
  });
});
