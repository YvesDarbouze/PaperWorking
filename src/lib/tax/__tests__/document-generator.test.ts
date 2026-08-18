import { generateTaxDocument } from '../document-generator';

describe('Agent 4: Tax Document Automation Unit Tests', () => {
  const mockDatapoints: any = {
    project_id: 'proj_tax_test_1',
    d1_acquisition: { deal_source: 'MLS', offers_sent: 1 },
    d2_purchase: { purchase_price: 279000, closing_costs: 3500 },
    d3_hold: {
      rental_income: 2400,
      monthly_mortgage: 1410.78,
      monthly_property_tax: 200,
      monthly_insurance: 150,
      rehab_labor: 0,
      rehab_materials: 0,
    },
    d4_exit: { sale_price: 320000, selling_costs: 18000 },
    d5_1040_es: {
      quarterly_net_income: 3000,
      payment_due_dates: ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15'],
    },
    d6_schedule_e: {
      rental_income_received: 28800,
      mortgage_interest_paid: 14508,
      property_tax_paid: 2400,
      insurance_premium: 1800,
      repairs_paid: 2400,
      management_fees_paid: 2880,
      utilities_paid: 1200,
      other_expenses: 0,
    },
    d7_depreciation: {
      property_basis: 279000,
      land_value: 55800,
      capital_improvements: [],
    },
    d8_capital_gains: { holding_period_months: 18 },
    d9_1099_returns: { contractors_paid: [{ name: 'Handyman Bob', amount: 1200 }] },
  };

  test('Generates 1040-ES PDF document from quarterly net income', async () => {
    const res = await generateTaxDocument(mockDatapoints, '1040-ES', 2026);
    expect(res.success).toBe(true);
    expect(res.formType).toBe('1040-ES');
    expect(res.pdfBuffer).toBeInstanceOf(Buffer);
    expect(res.pdfBuffer.length).toBeGreaterThan(0);
  });

  test('Generates Schedule E PDF document populated from metric engine', async () => {
    const res = await generateTaxDocument(mockDatapoints, 'Schedule-E', 2026);
    expect(res.success).toBe(true);
    expect(res.formType).toBe('Schedule-E');
    expect(res.fileName).toContain('Schedule-E');
  });

  test('Generates Form 4562 Depreciation PDF document', async () => {
    const res = await generateTaxDocument(mockDatapoints, 'Form-4562', 2026);
    expect(res.success).toBe(true);
    expect(res.formType).toBe('Form-4562');
  });

  test('Generates Schedule D Capital Gains PDF document', async () => {
    const res = await generateTaxDocument(mockDatapoints, 'Schedule-D', 2026);
    expect(res.success).toBe(true);
    expect(res.formType).toBe('Schedule-D');
  });
});
