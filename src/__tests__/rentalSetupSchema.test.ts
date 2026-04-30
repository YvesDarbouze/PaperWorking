/**
 * Rental Setup Zod Schema — Validation Tests
 * Tests: rentalSetupSchema parse/reject, computeRentalMetrics
 */
import {
  rentalSetupSchema,
  computeRentalMetrics,
  type RentalSetupInput,
} from '@/lib/validation/rentalSetupSchema';

// ── Valid baseline input ───────────────────────────────────
const validInput: RentalSetupInput = {
  projectedMonthlyRent: 2_500,
  vacancyRate: 5,
  maintenanceReserves: 200,
  propertyManagementFeePercent: 10,
  longTermMortgagePayment: 1_100,
  financingCashInvested: 60_000,
};

describe('rentalSetupSchema — validation', () => {
  it('accepts valid input', () => {
    const result = rentalSetupSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects negative rent', () => {
    const r = rentalSetupSchema.safeParse({ ...validInput, projectedMonthlyRent: -100 });
    expect(r.success).toBe(false);
  });

  it('rejects zero rent', () => {
    const r = rentalSetupSchema.safeParse({ ...validInput, projectedMonthlyRent: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects vacancy > 100%', () => {
    const r = rentalSetupSchema.safeParse({ ...validInput, vacancyRate: 110 });
    expect(r.success).toBe(false);
  });

  it('rejects negative percentages', () => {
    const r = rentalSetupSchema.safeParse({ ...validInput, propertyManagementFeePercent: -5 });
    expect(r.success).toBe(false);
  });

  it('rejects NaN / Infinity', () => {
    expect(rentalSetupSchema.safeParse({ ...validInput, projectedMonthlyRent: NaN }).success).toBe(false);
    expect(rentalSetupSchema.safeParse({ ...validInput, longTermMortgagePayment: Infinity }).success).toBe(false);
  });

  it('applies defaults for missing optional fields', () => {
    const minimal = { projectedMonthlyRent: 1_800 };
    const r = rentalSetupSchema.safeParse(minimal);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.vacancyRate).toBe(5);
      expect(r.data.maintenanceReserves).toBe(0);
    }
  });

  it('validates phone format', () => {
    const good = rentalSetupSchema.safeParse({ ...validInput, propertyManagerPhone: '305-555-1234' });
    expect(good.success).toBe(true);
    const bad = rentalSetupSchema.safeParse({ ...validInput, propertyManagerPhone: 'not-a-phone' });
    expect(bad.success).toBe(false);
  });

  it('validates email format', () => {
    const good = rentalSetupSchema.safeParse({ ...validInput, propertyManagerEmail: 'pm@acme.com' });
    expect(good.success).toBe(true);
    const bad = rentalSetupSchema.safeParse({ ...validInput, propertyManagerEmail: 'bad-email' });
    expect(bad.success).toBe(false);
  });

  it('allows empty strings for optional contact fields', () => {
    const r = rentalSetupSchema.safeParse({ ...validInput, propertyManagerPhone: '', propertyManagerEmail: '' });
    expect(r.success).toBe(true);
  });
});

describe('computeRentalMetrics — derived calculations', () => {
  const totalAllInCost = 280_000;

  it('calculates vacancy loss correctly', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.vacancyLoss).toBeCloseTo(2_500 * 0.05, 2);
  });

  it('derives EGI = rent - vacancy', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.effectiveGrossIncome).toBeCloseTo(2_500 - 125, 2);
  });

  it('computes property management fee from EGI', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.propertyManagementFeeValue).toBeCloseTo(2_375 * 0.10, 2);
  });

  it('derives NOI = EGI - OpEx', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    const expectedOpEx = 200 + (2_375 * 0.10);
    expect(m.netOperatingIncome).toBeCloseTo(2_375 - expectedOpEx, 2);
  });

  it('derives Net Cash Flow = NOI - mortgage', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.netCashFlow).toBeCloseTo(m.netOperatingIncome - 1_100, 2);
  });

  it('computes Cap Rate = annualNOI / totalAllInCost', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.capRate).toBeCloseTo((m.annualNOI / totalAllInCost) * 100, 4);
  });

  it('computes Cash-on-Cash from financingCashInvested', () => {
    const m = computeRentalMetrics(validInput, totalAllInCost);
    expect(m.cashOnCashReturn).toBeCloseTo((m.netCashFlow * 12 / 60_000) * 100, 4);
  });

  it('falls back to totalAllInCost when financingCashInvested is 0', () => {
    const noEquity = { ...validInput, financingCashInvested: 0 };
    const m = computeRentalMetrics(noEquity, totalAllInCost);
    expect(m.cashOnCashReturn).toBeCloseTo((m.netCashFlow * 12 / totalAllInCost) * 100, 4);
  });

  it('returns 0 cap rate when totalAllInCost is 0', () => {
    const m = computeRentalMetrics(validInput, 0);
    expect(m.capRate).toBe(0);
  });
});
