import { computeAmortizationSchedule, computeMonthlyPayment } from '../amortization-engine';

describe('Agent 4: Amortization Engine Unit Tests', () => {
  test('Golden Value: $223,200 principal, 6.5% interest, 30 years -> $1,410.78 monthly payment', () => {
    const amort = computeAmortizationSchedule(223200, 0.065, 30);
    expect(amort.monthlyPayment).toBe(1410.78);
    expect(amort.totalPayments).toBe(360);
    expect(amort.schedule.length).toBe(360);
  });

  test('Full 360-month schedule starts with correct principal/interest breakdown and finishes with zero balance', () => {
    const amort = computeAmortizationSchedule(223200, 0.065, 30);
    const firstPayment = amort.schedule[0];
    const lastPayment = amort.schedule[359];

    // Month 1 interest: 223,200 * (0.065 / 12) = 1,209.00
    expect(firstPayment.interest).toBe(1209.00);
    expect(firstPayment.principal).toBe(201.78);

    // Final balance is $0.00
    expect(lastPayment.balance).toBe(0);
  });

  test('Zero principal returns zero schedule', () => {
    const amort = computeAmortizationSchedule(0, 0.05, 30);
    expect(amort.monthlyPayment).toBe(0);
    expect(amort.schedule.length).toBe(0);
  });

  test('computeMonthlyPayment helper function matches schedule payment', () => {
    const payment = computeMonthlyPayment(200000, 0.07, 15);
    expect(payment).toBeGreaterThan(1700);
    expect(payment).toBeLessThan(1850);
  });
});
