import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';
import { deriveFiveGoldens } from '../canonicalEngine';

describe('Agent 4: Management Fee Basis Lock (BUG-8 Regression Tests)', () => {
  test('Management Fee MUST be computed on Gross Scheduled Rent ($28,800 @ 10% = $2,880)', async () => {
    const grossRent = 28800;
    const vacancyPct = 5; // GOI = $27,360
    const managementFeePct = 10;

    const res = await deriveAllProjectMetrics('proj_bug8_test', {
      mockData: {
        purchase_price: 279000,
        gross_scheduled_rent: grossRent,
        vacancy_rate: vacancyPct,
        operating_expenses: {
          management_fee_pct: managementFeePct,
          tax: 2000,
          insurance: 1000,
        },
      },
    });

    // 10% of gross scheduled rent ($28,800) = $2,880
    // If computed on GOI ($27,360 * 0.10), it would be $2,736 (WRONG — BUG-8)
    const expectedManagementFee = 2880; // $28,800 * 0.10
    const wrongManagementFeeOnGOI = 2736; // $27,360 * 0.10

    const totalOpEx = res.insights.financial.goi.value! - res.scorecard.noi.value!;
    expect(totalOpEx).toBe(2000 + 1000 + expectedManagementFee);
    expect(totalOpEx).not.toBe(2000 + 1000 + wrongManagementFeeOnGOI);
  });

  test('deriveFiveGoldens computes management fee on Gross Scheduled Rent', () => {
    const goldens = deriveFiveGoldens({
      purchasePrice: 277466,
      grossScheduledRent: 23400,
      vacancyRatePct: 7,
      totalOpEx: 9276,
      debtService: 16930,
      totalCashInvested: 60000,
      managementFeePct: 10,
    });

    expect(goldens.managementFeeAmount).toBe(2340); // 10% of $23,400 = $2,340
  });
});
