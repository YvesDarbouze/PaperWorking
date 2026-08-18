import {
  checkStateTaxRules,
  calculateDetailed1099Tracking,
  mapScheduleELines,
} from '../calculator';
import {
  calculateForm8825,
  checkDeMinimisSafeHarbor,
  checkRealEstateProfessionalStatus,
} from '../form8825';

describe('Legal & Financial Accuracy Engine (AGENT P-5)', () => {
  test('checkStateTaxRules identifies no-income-tax states', () => {
    const tx = checkStateTaxRules('TX');
    expect(tx.hasStateIncomeTax).toBe(false);
    expect(tx.message).toContain('no state income tax');

    const ny = checkStateTaxRules('NY');
    expect(ny.hasStateIncomeTax).toBe(true);
    expect(ny.message).toContain('State income tax rules apply');
  });

  test('calculateDetailed1099Tracking calculates remaining amount before threshold', () => {
    const res = calculateDetailed1099Tracking('John Smith', 550, '1099-NEC');
    expect(res.requiresForm).toBe(false);
    expect(res.amountRemainingUntilThreshold).toBe(50);
    expect(res.warningMessage).toContain('$50 more triggers Form 1099-NEC');

    const res2 = calculateDetailed1099Tracking('Jane Doe', 650, '1099-NEC');
    expect(res2.requiresForm).toBe(true);
    expect(res2.amountRemainingUntilThreshold).toBe(0);
    expect(res2.warningMessage).toContain('filing required');
  });

  test('calculateForm8825 allocates multi-member partnership rental income', () => {
    const res = calculateForm8825('Austin Real Estate LLC', [
      {
        propertyAddress: '100 Main St',
        grossRents: 24000,
        totalExpenses: 14000,
        ownershipPercentage: 50,
      },
    ]);

    expect(res.totalEntityGrossRents).toBe(24000);
    expect(res.totalEntityExpenses).toBe(14000);
    expect(res.totalEntityNetIncome).toBe(5000); // 50% of 10,000 net income
    expect(res.properties[0].allocatedNetIncome).toBe(5000);
  });

  test('checkDeMinimisSafeHarbor validates $2,500 threshold', () => {
    const cheapItem = checkDeMinimisSafeHarbor('New Faucet', 450);
    expect(cheapItem.qualifiesForDeMinimisSafeHarbor).toBe(true);
    expect(cheapItem.treatment).toContain('Expensed Immediately');

    const expensiveItem = checkDeMinimisSafeHarbor('Roof Replacement', 12000);
    expect(expensiveItem.qualifiesForDeMinimisSafeHarbor).toBe(false);
    expect(expensiveItem.treatment).toContain('Capitalized');
  });

  test('checkRealEstateProfessionalStatus validates 750+ hour REPS threshold', () => {
    const reps = checkRealEstateProfessionalStatus(800, 1000); // 800 hours / 1000 = 80%
    expect(reps.qualifiesForREPS).toBe(true);
    expect(reps.repsNotice).toContain('Qualifies for Real Estate Professional Status');

    const nonReps = checkRealEstateProfessionalStatus(300, 2000);
    expect(nonReps.qualifiesForREPS).toBe(false);
    expect(nonReps.repsNotice).toContain('Does not qualify');
  });
});
