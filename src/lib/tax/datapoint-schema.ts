import { z } from 'zod';

// D1. ACQUISITION METRICS
export const AcquisitionMetricsSchema = z.object({
  deal_source: z.string().default('Marketplace'),
  offers_sent: z.number().default(0),
  offer_acceptance_rate: z.number().default(0),
  crowdfunding_raised: z.number().default(0),
  investor_count: z.number().default(0),
  entity_formation_costs: z.number().default(0),
});
export type AcquisitionMetrics = z.infer<typeof AcquisitionMetricsSchema>;

// D2. PURCHASE METRICS
export const PurchaseMetricsSchema = z.object({
  purchase_price: z.number().default(0),
  closing_costs: z.number().default(0),
  loan_origination_fees: z.number().default(0),
  title_insurance: z.number().default(0),
  appraisal_fee: z.number().default(0),
  inspection_cost: z.number().default(0),
  attorney_fees: z.number().default(0),
  recording_fees: z.number().default(0),
});
export type PurchaseMetrics = z.infer<typeof PurchaseMetricsSchema>;

// D3. HOLD METRICS
export const HoldMetricsSchema = z.object({
  rehab_labor: z.number().default(0),
  rehab_materials: z.number().default(0),
  rehab_permits: z.number().default(0),
  monthly_mortgage: z.number().default(0),
  monthly_insurance: z.number().default(0),
  monthly_property_tax: z.number().default(0),
  monthly_utilities: z.number().default(0),
  monthly_hoa: z.number().default(0),
  monthly_maintenance: z.number().default(0),
  rental_income: z.number().default(0),
  vacancy_months: z.number().default(0),
  property_mgmt_fees: z.number().default(0),
  rehab_start_date: z.string().optional(),
  rehab_finish_date: z.string().optional(),
  rent_start_date: z.string().optional(),
});
export type HoldMetrics = z.infer<typeof HoldMetricsSchema>;

// D4. EXIT METRICS
export const ExitMetricsSchema = z.object({
  sale_price: z.number().default(0),
  sale_date: z.string().optional(),
  marketing_costs: z.number().default(0),
  staging_costs: z.number().default(0),
  realtor_commission: z.number().default(0),
  buyer_concessions: z.number().default(0),
  holding_days_total: z.number().default(0),
  exit_strategy: z.enum(['Flip', 'Rental Hold', '1031 Exchange', 'Wholesale']).default('Flip'),
});
export type ExitMetrics = z.infer<typeof ExitMetricsSchema>;

// D5. QUARTERLY ESTIMATED TAX (1040-ES)
export const EstimatedTax1040ESSchema = z.object({
  quarterly_net_income: z.number().default(0),
  estimated_tax_rate: z.number().default(0.25),
  prior_year_safe_harbor: z.number().default(0),
  prior_year_agi: z.number().default(100000),
  payment_due_dates: z.array(z.string()).default(['April 15', 'June 15', 'September 15', 'January 15']),
});
export type EstimatedTax1040ES = z.infer<typeof EstimatedTax1040ESSchema>;

// D6. SCHEDULE E (Supplemental Income & Loss)
export const ScheduleESchema = z.object({
  rental_income_received: z.number().default(0),
  mortgage_interest_paid: z.number().default(0),
  property_tax_paid: z.number().default(0),
  insurance_premium: z.number().default(0),
  repairs_maintenance: z.number().default(0),
  depreciation_amount: z.number().default(0),
  other_expenses: z.number().default(0),
});
export type ScheduleEData = z.infer<typeof ScheduleESchema>;

// D7. DEPRECIATION (Form 4562)
export const CapitalImprovementSchema = z.object({
  description: z.string(),
  cost: z.number(),
  date: z.string(),
});
export type CapitalImprovement = z.infer<typeof CapitalImprovementSchema>;

export const DepreciationForm4562Schema = z.object({
  property_basis: z.number().default(0),
  land_value: z.number().default(0),
  depreciable_basis: z.number().default(0),
  placed_in_service_date: z.string().default('2026-01-01'),
  method: z.enum(['MACRS_27_5_res', 'MACRS_39_comm']).default('MACRS_27_5_res'),
  annual_depreciation: z.number().default(0),
  capital_improvements: z.array(CapitalImprovementSchema).default([]),
});
export type DepreciationForm4562 = z.infer<typeof DepreciationForm4562Schema>;

// D8. CAPITAL GAINS / 1031 EXCHANGE (Schedule D, Form 8825)
export const CapitalGains1031Schema = z.object({
  adjusted_basis: z.number().default(0),
  amount_realized: z.number().default(0),
  capital_gain_loss: z.number().default(0),
  holding_period_months: z.number().default(0),
  long_term_flag: z.boolean().default(false),
  is_1031_exchange: z.boolean().default(false),
  replacement_property_1031: z.string().optional(),
  identified_date_1031: z.string().optional(),
  form_8825_income: z.number().default(0),
  form_8825_expenses: z.number().default(0),
});
export type CapitalGains1031 = z.infer<typeof CapitalGains1031Schema>;

// D9. INFORMATION RETURNS (1099 Series Ingestion & Generation)
export const ContractorPaymentSchema = z.object({
  name: z.string(),
  tax_id: z.string().optional(),
  amount: z.number(),
  type: z.enum(['NEC', 'MISC']),
});
export type ContractorPayment = z.infer<typeof ContractorPaymentSchema>;

export const InformationReturns1099Schema = z.object({
  form_1099s_proceeds: z.number().default(0),
  form_1099s_date: z.string().optional(),
  contractors_paid: z.array(ContractorPaymentSchema).default([]),
  form_1099nec_required: z.boolean().default(false),
  form_1099misc_rent_paid: z.number().default(0),
  form_1098_mortgage_interest: z.number().default(0),
  form_1098_points: z.number().default(0),
});
export type InformationReturns1099 = z.infer<typeof InformationReturns1099Schema>;

// D10. TEAM/VENDOR COSTS
export const VendorPaymentSchema = z.object({
  vendor_id: z.string(),
  service_type: z.string(),
  amount: z.number(),
  date: z.string(),
  project_id: z.string(),
});
export type VendorPayment = z.infer<typeof VendorPaymentSchema>;

// AGGREGATED PROJECT TAX DATAPOINTS (D1 to D10)
export const ProjectTaxDatapointsSchema = z.object({
  project_id: z.string(),
  tax_year: z.number().default(2026),
  d1_acquisition: AcquisitionMetricsSchema,
  d2_purchase: PurchaseMetricsSchema,
  d3_hold: HoldMetricsSchema,
  d4_exit: ExitMetricsSchema,
  d5_1040_es: EstimatedTax1040ESSchema,
  d6_schedule_e: ScheduleESchema,
  d7_depreciation: DepreciationForm4562Schema,
  d8_capital_gains: CapitalGains1031Schema,
  d9_1099_returns: InformationReturns1099Schema,
  d10_vendor_costs: z.array(VendorPaymentSchema).default([]),
});
export type ProjectTaxDatapoints = z.infer<typeof ProjectTaxDatapointsSchema>;
