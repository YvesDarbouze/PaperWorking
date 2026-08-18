import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { generateTaxDocument } from '@/lib/tax/document-generator';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const projectId = body.projectId || 'proj_demo_123';
    const taxYear = body.taxYear || 2026;

    const sampleDatapoints = {
      project_id: projectId,
      tax_year: taxYear,
      d1_acquisition: { deal_source: 'MLS', offers_sent: 3, offer_acceptance_rate: 0.33, crowdfunding_raised: 0, investor_count: 1, entity_formation_costs: 500 },
      d2_purchase: { purchase_price: 350000, closing_costs: 8500, loan_origination_fees: 3500, title_insurance: 1800, appraisal_fee: 600, inspection_cost: 500, attorney_fees: 1500, recording_fees: 300 },
      d3_hold: { rehab_labor: 25000, rehab_materials: 20000, rehab_permits: 1200, monthly_mortgage: 1800, monthly_insurance: 150, monthly_property_tax: 350, monthly_utilities: 200, monthly_hoa: 100, monthly_maintenance: 250, rental_income: 3200, vacancy_months: 0, property_mgmt_fees: 320 },
      d4_exit: { sale_price: 480000, sale_date: '2026-11-15', marketing_costs: 2000, staging_costs: 1500, realtor_commission: 24000, buyer_concessions: 2000, holding_days_total: 240, exit_strategy: 'Flip' as const },
      d5_1040_es: { quarterly_net_income: 18500, estimated_tax_rate: 0.25, prior_year_safe_harbor: 15000, prior_year_agi: 140000, payment_due_dates: ['April 15', 'June 15', 'September 15', 'January 15'] },
      d6_schedule_e: { rental_income_received: 38400, mortgage_interest_paid: 14200, property_tax_paid: 4200, insurance_premium: 1800, repairs_maintenance: 3000, depreciation_amount: 10181.82, other_expenses: 3840 },
      d7_depreciation: { property_basis: 350000, land_value: 70000, depreciable_basis: 280000, placed_in_service_date: '2026-01-15', method: 'MACRS_27_5_res' as const, annual_depreciation: 10181.82, capital_improvements: [] },
      d8_capital_gains: { adjusted_basis: 393818.18, amount_realized: 454000, capital_gain_loss: 60181.82, holding_period_months: 10, long_term_flag: false, is_1031_exchange: false, form_8825_income: 0, form_8825_expenses: 0 },
      d9_1099_returns: { form_1099s_proceeds: 480000, contractors_paid: [{ name: 'Apex Electric LLC', amount: 4500, type: 'NEC' as const }], form_1099nec_required: true, form_1099misc_rent_paid: 0, form_1098_mortgage_interest: 14200, form_1098_points: 0 },
      d10_vendor_costs: [],
    };

    const docResult = await generateTaxDocument(sampleDatapoints, '1040-ES', taxYear);

    return new NextResponse(new Uint8Array(docResult.pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${docResult.fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate 1040-ES document', details: errMsg }, { status: 500 });
  }
}
