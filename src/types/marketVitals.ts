// ── Market Vitals Types ──────────────────────────────────────
// Shared between the API route and UI components.

/** Single year's data point for sparkline rendering. */
export interface MarketDataPoint {
  year: number;
  value: number;
}

/** Demographics for a single ZIP code. */
export interface ZipDemographics {
  zipCode: string;
  population: MarketDataPoint[];          // 10-year trend
  medianHouseholdIncome: MarketDataPoint[]; // 10-year trend
  populationGrowth5yr: number;            // % change over last 5 years
  medianIncomeCurrent: number;            // Most recent year's value
  medianHomeValue?: number;               // ACS estimate
  povertyRate?: number;                   // % below poverty line
  medianAge?: number;
  ownerOccupiedPct?: number;              // % homeowners
  renterOccupiedPct?: number;             // % renters
  lastUpdated: string;                    // ISO date
  source: 'census_acs' | 'cached' | 'manual';
}

/** Zoning scan result from municipal GIS portal. */
export interface ZoningScanResult {
  zipCode: string;
  parcelId?: string;
  zoningCode: string;                     // e.g. "R-3", "C-1", "MU-2"
  zoningDescription: string;              // Human-readable
  permittedUnitDensity?: number;          // units per acre
  maxBuildingHeight?: string;             // e.g. "35 ft"
  lotCoverage?: string;                   // e.g. "60%"
  setbacks?: {
    front?: string;
    rear?: string;
    side?: string;
  };
  overlayDistricts?: string[];            // Historic, Flood, etc.
  recs: RecognizedEnvironmentalCondition[];
  scanDate: string;                       // ISO date
  source: string;                         // Portal URL
}

/** Recognized Environmental Condition from Phase I ESA reports. */
export interface RecognizedEnvironmentalCondition {
  id: string;
  type: 'REC' | 'CREC' | 'HREC' | 'De Minimis';
  description: string;
  severity: 'high' | 'medium' | 'low';
  location?: string;                      // Where on the property
  recommendation?: string;                // Phase II, monitoring, etc.
  source: string;                         // Document name or section
}

/** Market vitals API response shape. */
export interface MarketVitalsResponse {
  demographics: ZipDemographics;
  zoning?: ZoningScanResult;
  error?: string;
}
