/** Four high-level P&L buckets per the PaperWorking Exit Phase spec. */
export type TransactionBucket = 'REVENUE' | 'EXPENSE' | 'LIABILITY' | 'TRANSFER';

export interface ClassificationResult {
  reiCategory: string;
  bucket: TransactionBucket;
  confidence: number;
}

/**
 * Classifies a Plaid transaction into one of the 33-KPI REI categories
 * and one of four P&L buckets: REVENUE | EXPENSE | LIABILITY | TRANSFER.
 *
 * Rules are ordered from most-specific to least-specific.
 * The first matching rule wins.
 */
export function classifyTransaction(name: string): ClassificationResult {
  if (!name) {
    return { reiCategory: 'unknown', bucket: 'EXPENSE', confidence: 0.0 };
  }

  // ── TRANSFER bucket (non-P&L — must check before income/expense) ────────────
  if (/security deposit|sec dep/i.test(name)) {
    return { reiCategory: 'security_deposit', bucket: 'TRANSFER', confidence: 0.95 };
  }
  if (/owner draw|owner distribution|capital draw/i.test(name)) {
    return { reiCategory: 'owner_draw', bucket: 'TRANSFER', confidence: 0.9 };
  }
  if (/capex reserve|capital reserve|capital expenditure reserve/i.test(name)) {
    return { reiCategory: 'capex_reserve', bucket: 'TRANSFER', confidence: 0.9 };
  }
  if (/transfer|wire transfer|ach transfer|internal transfer/i.test(name)) {
    return { reiCategory: 'bank_transfer', bucket: 'TRANSFER', confidence: 0.8 };
  }

  // ── LIABILITY bucket (debt service / balance sheet) ──────────────────────────
  if (/mortgage|loan payment|principal|interest payment/i.test(name)) {
    return { reiCategory: 'debt_service', bucket: 'LIABILITY', confidence: 0.95 };
  }
  if (/escrow payment|escrow disbursement/i.test(name)) {
    return { reiCategory: 'escrow', bucket: 'LIABILITY', confidence: 0.9 };
  }

  // ── REVENUE bucket (specific patterns before generic rent rule) ─────────────
  if (/late fee|late charge|late payment fee/i.test(name)) {
    return { reiCategory: 'late_fees', bucket: 'REVENUE', confidence: 0.9 };
  }
  if (/pet rent|pet deposit income|pet fee/i.test(name)) {
    return { reiCategory: 'pet_rent', bucket: 'REVENUE', confidence: 0.9 };
  }
  if (/parking fee|parking income|parking rent/i.test(name)) {
    return { reiCategory: 'parking', bucket: 'REVENUE', confidence: 0.9 };
  }
  if (/application fee|tenant application|screening fee/i.test(name)) {
    return { reiCategory: 'application_fees', bucket: 'REVENUE', confidence: 0.9 };
  }
  if (/laundry|vending machine|coin laundry/i.test(name)) {
    return { reiCategory: 'laundry_vending', bucket: 'REVENUE', confidence: 0.85 };
  }
  // Short-term rental platforms — must be explicit to avoid matching 'rental' in other contexts
  if (/airbnb|vrbo|\bshort.?term rental\b|\bvacation rental\b/i.test(name)) {
    return { reiCategory: 'rental_income', bucket: 'REVENUE', confidence: 0.9 };
  }
  // Generic rent — comes after all more-specific income rules
  if (/\brent\b(?! deposit)|lease payment|\brental income\b|tenant payment/i.test(name)) {
    return { reiCategory: 'rental_income', bucket: 'REVENUE', confidence: 0.9 };
  }

  // ── EXPENSE bucket ───────────────────────────────────────────────────────────
  if (/staging|renovation|rehab|construction|materials|lumber/i.test(name)) {
    return { reiCategory: 'rehab_staging', bucket: 'EXPENSE', confidence: 0.8 };
  }
  if (/hoa|homeowners association|condo fee/i.test(name)) {
    return { reiCategory: 'hoa_fees', bucket: 'EXPENSE', confidence: 0.9 };
  }
  if (/insurance|allstate|state farm|progressive|nationwide|farmers/i.test(name)) {
    return { reiCategory: 'insurance', bucket: 'EXPENSE', confidence: 0.85 };
  }
  if (/property tax|real estate tax|county tax|tax collector/i.test(name)) {
    return { reiCategory: 'property_tax', bucket: 'EXPENSE', confidence: 0.9 };
  }
  if (/repair|maintenance|plumber|electrician|hvac|roofing|handyman/i.test(name)) {
    return { reiCategory: 'maintenance', bucket: 'EXPENSE', confidence: 0.8 };
  }
  if (/electric|gas bill|water bill|sewer|trash|utility|con edison|pg&e|national grid/i.test(name)) {
    return { reiCategory: 'utilities', bucket: 'EXPENSE', confidence: 0.85 };
  }
  if (/property management|pm fee|management fee/i.test(name)) {
    return { reiCategory: 'property_management', bucket: 'EXPENSE', confidence: 0.9 };
  }
  if (/title|appraisal|inspection|closing cost/i.test(name)) {
    return { reiCategory: 'closing_costs', bucket: 'EXPENSE', confidence: 0.85 };
  }
  if (/legal|attorney|lawyer|law firm|professional fee|accounting|cpa|bookkeeping/i.test(name)) {
    return { reiCategory: 'legal_professional', bucket: 'EXPENSE', confidence: 0.85 };
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return { reiCategory: 'unknown', bucket: 'EXPENSE', confidence: 0.0 };
}
