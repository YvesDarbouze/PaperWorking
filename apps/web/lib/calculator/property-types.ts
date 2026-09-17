export interface PropertyComparableSale {
  address: string;
  sale_price: number;
  sale_date?: string;
  sqft?: number;
  distance?: number;
  source: string;
  asOf: string;
  isStale?: boolean;
}

export interface UnifiedPropertyLookupResult {
  provider: string;
  configured: boolean;
  facts: Record<string, unknown> | null;
  estimatedRent?: number;
  rentRangeLow?: number;
  rentRangeHigh?: number;
  estimatedValue?: number;
  valueRangeLow?: number;
  valueRangeHigh?: number;
  comps: PropertyComparableSale[];
  requiresCredentials?: boolean;
  message?: string;
  source?: string;
  asOf?: string;
  as_of?: string;
  isStale?: boolean;
}
