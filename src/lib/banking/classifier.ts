export interface ClassificationResult {
  reiCategory: string;
  confidence: number;
}

export function classifyTransaction(name: string): ClassificationResult {
  if (!name) {
    return { reiCategory: 'unknown', confidence: 0.0 };
  }

  // Rules in order of specificity
  if (/staging|renovation|rehab|construction|materials|lumber/i.test(name)) {
    return { reiCategory: 'rehab_staging', confidence: 0.8 };
  }

  if (/rent|lease payment|tenant|airbnb|vrbo/i.test(name)) {
    return { reiCategory: 'rental_income', confidence: 0.9 };
  }

  if (/mortgage|loan payment|principal|interest/i.test(name)) {
    return { reiCategory: 'debt_service', confidence: 0.95 };
  }

  if (/hoa|homeowners association|condo fee/i.test(name)) {
    return { reiCategory: 'hoa_fees', confidence: 0.9 };
  }

  if (/insurance|allstate|state farm|progressive/i.test(name)) {
    return { reiCategory: 'insurance', confidence: 0.85 };
  }

  if (/property tax|real estate tax|county tax/i.test(name)) {
    return { reiCategory: 'property_tax', confidence: 0.9 };
  }

  if (/repair|maintenance|plumber|electrician|hvac|roofing/i.test(name)) {
    return { reiCategory: 'maintenance', confidence: 0.8 };
  }

  if (/electric|gas|water|sewer|trash|utility/i.test(name)) {
    return { reiCategory: 'utilities', confidence: 0.85 };
  }

  if (/property management|pm fee|management fee/i.test(name)) {
    return { reiCategory: 'property_management', confidence: 0.9 };
  }

  if (/title|escrow|appraisal|inspection|closing/i.test(name)) {
    return { reiCategory: 'closing_costs', confidence: 0.85 };
  }

  return { reiCategory: 'unknown', confidence: 0.0 };
}
