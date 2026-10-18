import { z } from 'zod';

export const STORAGE_TOTAL_LIMIT_BYTES = 536870912;

const STRATEGY_VALUES = [
  'flip',
  'brrrr',
  'buy_and_hold_rental',
  'short_term_rental_airbnb',
  'commercial_value_add',
  'wholesale',
] as const;

const STRATEGY_ALIAS_MAP: Record<string, (typeof STRATEGY_VALUES)[number]> = {
  flip: 'flip',
  fix_and_flip: 'flip',
  fix_flip: 'flip',
  rehab_flip: 'flip',
  new_construction: 'flip',
  brrrr: 'brrrr',
  brrrr_refinance: 'brrrr',
  value_add_brrrr: 'brrrr',
  buy_and_hold: 'buy_and_hold_rental',
  buy_hold: 'buy_and_hold_rental',
  buy_and_hold_rental: 'buy_and_hold_rental',
  buy_hold_rental: 'buy_and_hold_rental',
  long_term_rental: 'buy_and_hold_rental',
  rental: 'buy_and_hold_rental',
  custom_other: 'buy_and_hold_rental',
  short_term_rental: 'short_term_rental_airbnb',
  short_term_rental_airbnb: 'short_term_rental_airbnb',
  short_term_airbnb: 'short_term_rental_airbnb',
  str: 'short_term_rental_airbnb',
  airbnb: 'short_term_rental_airbnb',
  pop_up_activation: 'short_term_rental_airbnb',
  value_add: 'commercial_value_add',
  commercial_value_add: 'commercial_value_add',
  commercial: 'commercial_value_add',
  commercial_multi_family: 'commercial_value_add',
  commercial_and_multi_family: 'commercial_value_add',
  multifamily: 'commercial_value_add',
  multi_family: 'commercial_value_add',
  syndication: 'commercial_value_add',
  wholesale: 'wholesale',
  wholesale_deal: 'wholesale',
};

function normalizeStrategyValue(val: unknown): unknown {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'string') {
    const key = val.trim().toLowerCase();
    if (STRATEGY_ALIAS_MAP[key]) return STRATEGY_ALIAS_MAP[key];
    const slugKey = key.replace(/[\s/&+()-]+/g, '_').replace(/^_+|_+$/g, '');
    if (STRATEGY_ALIAS_MAP[slugKey]) return STRATEGY_ALIAS_MAP[slugKey];
    return val;
  }
  return val;
}

function parseNumericValue(val: unknown): number | typeof NaN | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[$,%\s]/g, '');
    if (cleaned === '') return undefined;
    const n = Number(cleaned);
    return Number.isNaN(n) ? NaN : n;
  }
  return NaN;
}

function optionalNonNegativeWithDefault(fieldLabel: string, defaultVal: number) {
  return z.preprocess(
    (val) => {
      const parsed = parseNumericValue(val);
      if (parsed === undefined) return defaultVal;
      if (Number.isNaN(parsed)) return val;
      return parsed;
    },
    z
      .number({ invalid_type_error: `${fieldLabel} must be a valid number` })
      .nonnegative(`${fieldLabel} cannot be negative`)
      .default(defaultVal),
  );
}

function optionalNonNegativeNumber(fieldLabel: string) {
  return z.preprocess(
    (val) => {
      const parsed = parseNumericValue(val);
      if (parsed === undefined) return undefined;
      if (Number.isNaN(parsed)) return val;
      return parsed;
    },
    z
      .number({ invalid_type_error: `${fieldLabel} must be a valid number` })
      .nonnegative(`${fieldLabel} cannot be negative`)
      .optional(),
  );
}

function optionalPositiveNumber(fieldLabel: string) {
  return z.preprocess(
    (val) => {
      const parsed = parseNumericValue(val);
      if (parsed === undefined || parsed === 0) return undefined;
      if (Number.isNaN(parsed)) return val;
      return parsed;
    },
    z
      .number({ invalid_type_error: `${fieldLabel} must be a valid number` })
      .positive(`${fieldLabel} must be greater than zero`)
      .optional(),
  );
}

function optionalPositiveWithDefault(fieldLabel: string, defaultVal: number) {
  return z.preprocess(
    (val) => {
      const parsed = parseNumericValue(val);
      if (parsed === undefined || parsed === 0) return defaultVal;
      if (Number.isNaN(parsed)) return val;
      return parsed;
    },
    z
      .number({ invalid_type_error: `${fieldLabel} must be a valid number` })
      .positive(`${fieldLabel} must be greater than zero`)
      .default(defaultVal),
  );
}

function optionalNullableString() {
  return z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.string().optional(),
  );
}

function isValidIsoCalendarDate(raw: string): boolean {
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function optionalValidIsoDateString(fieldLabel: string) {
  return z.preprocess(
    (val) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return undefined;
        const isoDatePrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
        if (isoDatePrefix) return isoDatePrefix[1];
        return trimmed;
      }
      return val;
    },
    z
      .string({ invalid_type_error: `${fieldLabel} must be a valid YYYY-MM-DD date` })
      .refine(isValidIsoCalendarDate, {
        message: `${fieldLabel} must be a valid calendar date between 2000 and 2100 (YYYY-MM-DD)`,
      })
      .optional(),
  );
}

export const FIELD_VALIDATION_LABELS: Record<string, string> = {
  address: 'Property Address',
  property_address: 'Property Address',
  projectName: 'Project Name',
  propertyName: 'Property Name',
  purchasePrice: 'Purchase Price',
  purchase_price: 'Purchase Price',
  rehabBudget: 'Rehab Budget',
  rehab_budget: 'Rehab Budget',
  estimatedARV: 'Estimated ARV',
  grossRentMonthly: 'Monthly Gross Rent',
  operatingExpenseRatioPct: 'Operating Expense Ratio (%)',
  targetLtvPct: 'Target LTV (%)',
  interestRatePct: 'Interest Rate (%)',
  amortizationYears: 'Amortization Period (Years)',
  strategy: 'Investment Strategy',
  buyerClosingCostsPct: 'Buyer Closing Costs (%)',
  beds: 'Bedrooms',
  baths: 'Bathrooms',
  sqft: 'Square Footage',
  yearBuilt: 'Year Built',
  taxAssessment: 'Tax Assessment',
  targetContractDate: 'Target Contract (PSA) Date',
  targetClosingDate: 'Target Closing Date',
};

/**
 * Formats a Zod fieldErrors map into a clear, actionable validation message
 * naming each field and the specific rule that failed.
 */
export function formatValidationFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): string {
  const entries = Object.entries(fieldErrors).filter(
    ([, msgs]) => Array.isArray(msgs) && msgs.length > 0,
  );
  if (entries.length === 0) {
    return 'Validation failed: please check required project fields.';
  }

  const formattedParts = entries.map(([field, msgs]) => {
    const label = FIELD_VALIDATION_LABELS[field] || field;
    const ruleText = (msgs ?? []).join(', ');
    const displayField = label === field ? field : `${label} (${field})`;
    return `${displayField}: ${ruleText}`;
  });

  return `Validation failed: ${formattedParts.join('; ')}`;
}

export const projectCreateSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    const raw = input as Record<string, unknown>;
    return {
      ...raw,
      property_address: raw.property_address ?? raw.address,
      propertyName: raw.propertyName ?? raw.projectName,
      purchase_price: raw.purchase_price ?? raw.purchasePrice,
      rehab_budget: raw.rehab_budget ?? raw.rehabBudget,
    };
  },
  z.object({
    propertyName: optionalNullableString(),
    property_address: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z
        .string({
          required_error: 'Property address is required',
          invalid_type_error: 'Property address is required',
        })
        .min(1, 'Property address is required'),
    ),
    phase: z.enum(['acquisition', 'purchase', 'hold', 'exit']).default('acquisition'),
    acquisitionStatus: z
      .enum([
        'lead',
        'analyzing',
        'offer_sent',
        'negotiating',
        'under_contract',
        'due_diligence',
        'clear_to_close',
        'closed',
        'dead',
      ])
      .default('lead'),
    strategy: z.preprocess(
      normalizeStrategyValue,
      z
        .enum(STRATEGY_VALUES, {
          errorMap: () => ({
            message: `Investment strategy must be one of: ${STRATEGY_VALUES.join(', ')}`,
          }),
        })
        .optional()
        .default('flip'),
    ),
    date_of_sale: z.string().optional().nullable(),
    entity_type: z.preprocess(
      (val) => (val === null || val === '' ? undefined : val),
      z.string().optional().default('Sole Proprietor'),
    ),
    purchase_price: z.preprocess(
      (val) => {
        if (val === null || val === '') return null;
        const parsed = parseNumericValue(val);
        if (parsed === undefined) return undefined;
        if (Number.isNaN(parsed)) return val;
        return parsed;
      },
      z.number({ invalid_type_error: 'Purchase price must be a valid number' }).nullable().optional(),
    ),
    rehab_budget: z.preprocess(
      (val) => {
        if (val === null || val === '') return null;
        const parsed = parseNumericValue(val);
        if (parsed === undefined) return undefined;
        if (Number.isNaN(parsed)) return val;
        return parsed;
      },
      z.number({ invalid_type_error: 'Rehab budget must be a valid number' }).nullable().optional(),
    ),
    exit_strategy: z.preprocess(
      (val) => (val === null || val === '' ? undefined : val),
      z.string().optional().default('Flip'),
    ),
    answers: z.record(z.string(), z.any()).optional().default({}),
    organizationId: optionalNullableString(),
    sourcing: z.record(z.string(), z.any()).optional(),
    propertySnapshot: z.record(z.string(), z.any()).optional(),
    underwritingSnapshot: z.record(z.string(), z.any()).optional(),
    documents: z
      .array(
        z.object({
          doc_id: z.string(),
          type: z.string(),
          url: z.string(),
          name: z.string().optional(),
          size_bytes: z.number().optional(),
          generated_at: z.string(),
        }),
      )
      .optional()
      .default([]),
  }),
);

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectPromoteSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    const raw = input as Record<string, unknown>;
    const rawAddr = typeof raw.address === 'string' ? raw.address.trim() : '';
    const rawPropAddr = typeof raw.property_address === 'string' ? raw.property_address.trim() : '';
    const rawProjName = typeof raw.projectName === 'string' ? raw.projectName.trim() : '';
    const rawPropName = typeof raw.propertyName === 'string' ? raw.propertyName.trim() : '';
    return {
      ...raw,
      address:
        rawAddr ||
        rawPropAddr ||
        rawProjName ||
        rawPropName ||
        raw.address ||
        raw.property_address,
      projectName: raw.projectName ?? raw.propertyName,
      purchasePrice: raw.purchasePrice ?? raw.purchase_price,
      rehabBudget: raw.rehabBudget ?? raw.rehab_budget,
    };
  },
  z.object({
    address: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z
        .string({
          required_error: 'Property address is required',
          invalid_type_error: 'Property address is required',
        })
        .min(1, 'Property address is required'),
    ),
    projectName: optionalNullableString(),
    purchasePrice: z.preprocess(
      (val) => {
        const parsed = parseNumericValue(val);
        if (parsed === undefined) return val === '' ? undefined : val;
        if (Number.isNaN(parsed)) return val;
        return parsed;
      },
      z
        .number({
          required_error: 'Purchase price is required',
          invalid_type_error: 'Purchase price must be a valid number',
        })
        .positive('Purchase price must be greater than zero'),
    ),
    rehabBudget: optionalNonNegativeWithDefault('Rehab budget', 0),
    estimatedARV: optionalPositiveNumber('Estimated ARV'),
    grossRentMonthly: optionalNonNegativeWithDefault('Monthly gross rent', 0),
    operatingExpenseRatioPct: optionalNonNegativeWithDefault('Operating expense ratio', 35),
    targetLtvPct: optionalNonNegativeWithDefault('Target LTV', 75),
    interestRatePct: optionalNonNegativeWithDefault('Interest rate', 6.5),
    amortizationYears: optionalPositiveWithDefault('Amortization period', 30),
    strategy: z.preprocess(
      normalizeStrategyValue,
      z
        .enum(STRATEGY_VALUES, {
          errorMap: () => ({
            message: `Investment strategy must be one of: ${STRATEGY_VALUES.join(', ')}`,
          }),
        })
        .optional()
        .default('buy_and_hold_rental'),
    ),
    assumptionsNotes: optionalNullableString(),
    organizationId: optionalNullableString(),
    buyerClosingCostsPct: optionalNonNegativeNumber('Buyer closing costs (%)'),
    beds: optionalNonNegativeNumber('Bedrooms'),
    baths: optionalNonNegativeNumber('Bathrooms'),
    sqft: optionalNonNegativeNumber('Square footage'),
    yearBuilt: optionalPositiveNumber('Year built'),
    taxAssessment: optionalNonNegativeNumber('Tax assessment'),
    targetContractDate: optionalValidIsoDateString('Target Contract (PSA) Date'),
    targetClosingDate: optionalValidIsoDateString('Target Closing Date'),
  }),
);

export type ProjectPromoteInput = z.infer<typeof projectPromoteSchema>;

export type ProjectPhase = ProjectCreateInput['phase'];

export function phaseToCurrentPhase(phase: ProjectPhase): number {
  if (phase === 'acquisition') return 1;
  if (phase === 'purchase') return 2;
  if (phase === 'hold') return 3;
  return 4;
}

export function calculateStorageQuotaBytes(existingProjectCount: number): number {
  const newTotalProjects = existingProjectCount + 1;
  return Math.floor(STORAGE_TOTAL_LIMIT_BYTES / newTotalProjects);
}

export function isVendorAccount(userData: {
  account_type?: string;
  accountType?: string;
  role?: string;
} | null | undefined): boolean {
  if (!userData) return false;
  return userData.account_type === 'vendor' || userData.role === 'vendor';
}
