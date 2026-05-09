import { 
  derivePropertyFinancials, 
  deriveOperationalData, 
  deriveMarketPortfolio 
} from '../components/dashboard/charts/LifecycleMetricsDashboard';
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
      }
    }
  ];

  it('derivePropertyFinancials calculates NOI, CapRate, and DSCR correctly', () => {
    const data = derivePropertyFinancials(mockProjects as Project[]);
    expect(data.length).toBe(2);
    
    // Project 1
    // NOI = 1500 * 12 * 0.5 = 9000
    // CapRate = 9000 / 150000 * 100 = 6
    // LoanPayment = 80000 * 0.007 = 560
    // DSCR = (9000 / 12) / 560 = 750 / 560 = 1.339
    expect(data[0].NOI).toBe(9000);
    expect(data[0].CapRate).toBe(6);
    expect(data[0].DSCR).toBeCloseTo(1.339, 3);
    expect(data[0].name).toBe('Alpha Esta'); // 10 char substring
  });

  it('deriveOperationalData scales with project count', () => {
    const data1 = deriveOperationalData([mockProjects[0]] as Project[]);
    const data2 = deriveOperationalData(mockProjects as Project[]);

    // With 1 project: baseOcc = 85 + 2 = 87
    expect(data1[0].Occupancy).toBe(83); // 87 - 4
    expect(data1[0].Maintenance).toBe(2500); // 2400 + 100

    // With 2 projects: baseOcc = 85 + 4 = 89
    expect(data2[0].Occupancy).toBe(85); // 89 - 4
    expect(data2[0].Maintenance).toBe(2600); // 2400 + 200
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
