import {
  calculateQuarterlyPL,
  calculate1040ES,
  calculateScheduleE,
  calculateDepreciation,
  calculateCapitalGains,
  calculate1031Exchange,
  calculate1099Thresholds,
} from '../calculator';
import { ProjectTaxDatapoints } from '../datapoint-schema';

describe('Agent 4: Tax Datapoint Engine & Calculator Unit Tests', () => {
  const mockDatapoints: ProjectTaxDatapoints = {
    project_id: 'proj_test_tax_123',
    tax_year: 2026,
    d1_acquisition: { deal_source: 'MLS', offers_sent: 5, offer_acceptance_rate: 0.2, crowdfunding_raised: 50000, investor_count: 2, entity_formation_costs: 800 },
    d2_purchase: { purchase_price: 300000, closing_costs: 6000, loan_origination_fees: 3000, title_insurance: 1500, appraisal_fee: 500, inspection_cost: 400, attorney_fees: 1200, recording_fees: 200 },
    d3_hold: { rehab_labor: 20000, rehab_materials: 15000, rehab_permits: 1000, monthly_mortgage: 1500, monthly_insurance: 120, monthly_property_tax: 300, monthly_utilities: 150, monthly_hoa: 80, monthly_maintenance: 200, rental_income: 3000, vacancy_months: 0, property_mgmt_fees: 300 },
    d4_exit: { sale_price: 450000, sale_date: '2026-10-15', marketing_costs: 1500, staging_costs: 1000, realtor_commission: 22500, buyer_concessions: 1500, holding_days_total: 270, exit_strategy: 'Flip' },
    d5_1040_es: { quarterly_net_income: 15000, estimated_tax_rate: 0.25, prior_year_safe_harbor: 12000, prior_year_agi: 120000, payment_due_dates: ['April 15', 'June 15', 'September 15', 'January 15'] },
    d6_schedule_e: { rental_income_received: 36000, mortgage_interest_paid: 12000, property_tax_paid: 3600, insurance_premium: 1440, repairs_maintenance: 2400, depreciation_amount: 8727.27, other_expenses: 3240 },
    d7_depreciation: { property_basis: 300000, land_value: 60000, depreciable_basis: 240000, placed_in_service_date: '2026-01-01', method: 'MACRS_27_5_res', annual_depreciation: 8727.27, capital_improvements: [{ description: 'New Roof', cost: 12000, date: '2026-04-01' }] },
    d8_capital_gains: { adjusted_basis: 338272.73, amount_realized: 426000, capital_gain_loss: 87727.27, holding_period_months: 9, long_term_flag: false, is_1031_exchange: false, form_8825_income: 0, form_8825_expenses: 0 },
    d9_1099_returns: { form_1099s_proceeds: 450000, contractors_paid: [{ name: 'BuildRight Construction', amount: 8500, type: 'NEC' }, { name: 'Small Handyman', amount: 450, type: 'NEC' }], form_1099nec_required: true, form_1099misc_rent_paid: 0, form_1098_mortgage_interest: 12000, form_1098_points: 0 },
    d10_vendor_costs: [{ vendor_id: 'v_1', service_type: 'Legal', amount: 1200, date: '2026-01-10', project_id: 'proj_test_tax_123' }],
  };

  test('1. calculateQuarterlyPL calculates net income correctly', () => {
    const res = calculateQuarterlyPL(mockDatapoints, 1);
    expect(res.totalIncome).toBe(9000); // 3000 * 3
    expect(res.totalExpenses).toBe((1500 + 120 + 300 + 150 + 80 + 200 + 300) * 3); // 2650 * 3 = 7950
    expect(res.netIncome).toBe(1050); // 9000 - 7950
  });

  test('2. calculate1040ES calculates tax due and checks Safe Harbor', () => {
    const res = calculate1040ES(15000, 0.25, 12000, 120000);
    expect(res.estimatedTaxDue).toBe(3750); // 15000 * 0.25
    expect(res.safeHarborThreshold).toBe(3000); // 12000 / 4
    expect(res.qualifiesForSafeHarbor).toBe(true);
  });

  test('3. calculate1040ES applies 110% safe harbor multiplier for AGI > $150k', () => {
    const res = calculate1040ES(15000, 0.25, 12000, 180000);
    expect(res.safeHarborMultiplier).toBe(1.1);
    expect(res.safeHarborThreshold).toBe(3300); // (12000 * 1.1) / 4
  });

  test('4. calculateScheduleE computes rental net loss or income', () => {
    const res = calculateScheduleE(mockDatapoints);
    expect(res.grossRentalIncome).toBe(36000);
    expect(res.itemizedExpenses.mortgageInterest).toBe(12000);
    expect(res.itemizedExpenses.depreciation).toBe(8727.27);
    expect(res.netRentalIncomeOrLoss).toBeCloseTo(4592.73, 2);
  });

  test('5. calculateDepreciation computes MACRS 27.5-year residential straight line', () => {
    const res = calculateDepreciation(mockDatapoints);
    expect(res.propertyBasis).toBe(300000);
    expect(res.landValue).toBe(60000);
    expect(res.depreciableBasis).toBe(240000);
    expect(res.annualDepreciation).toBe(8727.27); // 240000 / 27.5
  });

  test('6. calculateCapitalGains determines adjusted basis and short-term vs long-term', () => {
    const res = calculateCapitalGains(mockDatapoints);
    // adjustedBasis = 300000 + 6000 + 35000 (rehab) + 12000 (roof) - 8727.27 (deprec) = 344272.73
    expect(res.adjustedBasis).toBe(344272.73);
    expect(res.isLongTerm).toBe(false); // 9 months holding period
    expect(res.taxTreatment).toBe('Ordinary Income (Short-Term)');
  });

  test('7. calculate1031Exchange validates 45-day identification rule', () => {
    const compliant = calculate1031Exchange('2026-01-01', '2026-02-10', 50000);
    expect(compliant.within45Days).toBe(true);
    expect(compliant.deferredTaxGain).toBe(50000);
    expect(compliant.status).toBe('Compliant');

    const nonCompliant = calculate1031Exchange('2026-01-01', '2026-03-01', 50000);
    expect(nonCompliant.within45Days).toBe(false);
    expect(nonCompliant.deferredTaxGain).toBe(0);
    expect(nonCompliant.status).toBe('Non-Compliant - Exceeded 45-Day Identification Window');
  });

  test('8. calculate1099Thresholds identifies contractors exceeding $600', () => {
    const thresholds = calculate1099Thresholds(mockDatapoints);
    expect(thresholds).toHaveLength(2);
    expect(thresholds[0].requires1099NEC).toBe(true); // BuildRight ($8,500)
    expect(thresholds[1].requires1099NEC).toBe(false); // Handyman ($450)
  });
});
