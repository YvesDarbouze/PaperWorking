import { runHXFixtures } from '../holdFixtures';
import { deriveAllMetrics } from '../../metrics/reiMetrics';

describe('HD-4 Engine Execution against Fixtures HX-1…HX-5', () => {
  test('Executes deriveHoldOperations on all five HX fixtures and outputs candidate goldens', () => {
    const runs = runHXFixtures();
    expect(runs).toHaveLength(5);

    console.log('\n================================================================================');
    console.log('            HD-4 CANDIDATE OUTPUTS FOR FOUNDER TERMINAL COUNTERSIGN             ');
    console.log('================================================================================\n');

    runs.forEach(({ config, result }) => {
      console.log(`>>> ${config.name} (${config.fixtureId})`);
      console.log(`    Loan Carry (Monthly):      $${result.loanCarryMonthly.toFixed(2)}`);
      console.log(`    Total Category Monthly:   $${result.totalCategoryMonthly.toFixed(2)}`);
      console.log(`    Monthly Carry (Total):    $${result.monthlyCarry.toFixed(2)}`);
      console.log(`    Rehab Budget:             $${result.rehabBudget.toLocaleString()}`);
      console.log(`    Spend to Date (Actuals):  $${result.spendToDate.toLocaleString()}`);
      console.log(`    Pending Approval Spend:   $${result.pendingApprovalSpend.toLocaleString()}`);
      console.log(`    Budget Variance:          $${result.budgetVariance.toLocaleString()} (${result.budgetVariancePct}%)`);
      console.log(`    80% Budget Crossed:       ${result.is80PercentBudgetCrossed}`);
      console.log(`    Reserve Policy Monthlies: Vacancy $${result.projectedReserveMonthlies.vacancyCreditLossMonthly}, R&M $${result.projectedReserveMonthlies.repairsMaintenanceReserveMonthly}, CapEx $${result.projectedReserveMonthlies.replacementReservesCapExMonthly}`);
      console.log(`    Marketing Spend (Ad Log): $${result.marketingSpendToDate}`);
      
      if (result.runway) {
        console.log(`    [SALE Runway] List Price: $${result.runway.listPriceSale.toLocaleString()}, Projected Margin: $${result.runway.projectedMargin.toLocaleString()}, Cumulative Cost to Date: $${result.runway.cumulativeCostToDate.toLocaleString()}, Remaining Margin: $${result.runway.remainingMargin.toLocaleString()}, Margin Erosion Date: ${result.runway.marginErosionDate}`);
      }
      console.log('--------------------------------------------------------------------------------');
    });

    // Assertions for HX-1
    const hx1 = runs[0].result;
    expect(hx1.monthlyCarry).toBe(2183.83); // $1,410.83 loan carry + $773 category monthlies

    // Assertions for HX-2 & HX-3
    const hx2 = runs[1].result;
    expect(hx2.spendToDate).toBe(23500);
    expect(hx2.is80PercentBudgetCrossed).toBe(false);

    const hx3 = runs[2].result;
    expect(hx3.spendToDate).toBe(32100);
    expect(hx3.is80PercentBudgetCrossed).toBe(true);

    // Assertions for HX-4
    const hx4 = runs[3].result;
    expect(hx4.marketingSpendToDate).toBe(450);
    expect(hx4.monthlyCarry).toBe(2183.83); // Marketing spend excluded from monthly carry

    // Assertions for HX-5
    const hx5 = runs[4].result;
    expect(hx5.spendToDate).toBe(1850);
    expect(hx5.pendingApprovalSpend).toBe(2400); // Excluded from actuals boundary
  });

  test('Golden Five reproduced from live deriveAllMetrics call (unchanged)', () => {
    const seedFinancials = {
      purchasePrice: 279000,
      estimatedARV: 350000,
      monthlyGrossRent: 1950,
      vacancyRatePercent: 7,
      holdingCostTaxes: 200,
      holdingCostInsurance: 58,
      holdingCostUtilities: 125,
      propertyManagementFeePercent: 10,
      monthlyMaintenanceReserve: 195,
      monthlyHOA: 0,
      loanAmount: 223200,
      loanInterestRate: 6.5,
      loanTermYears: 30,
      projectedRehabCost: 0,
      fixedAcquisitionCosts: 4200,
      emdAmount: 0,
      projectedHoldTimeMonths: 0,
      annualAppreciationPercent: 3,
      costs: [],
    };

    const metrics = deriveAllMetrics(seedFinancials as any, undefined, 'Rent', 1);

    expect(metrics.noi).toBe(12486);
    expect(metrics.capRate).toBe(4.5);
    expect(metrics.annualCashFlow).toBeCloseTo(-4444, 0);
    expect(metrics.dscr).toBe(0.74);
    expect(metrics.cashOnCashReturn).toBeCloseTo(-7.41, 2);
  });
});
