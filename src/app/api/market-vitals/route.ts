import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import type { ZipDemographics, MarketDataPoint } from '@/types/marketVitals';

/* ═══════════════════════════════════════════════════════════════
   Market Vitals API — /api/market-vitals?zip=XXXXX
   
   Data source: U.S. Census Bureau American Community Survey (ACS)
   5-year estimates via the public API.
   
   Variables used:
     B01003_001E  — Total Population
     B19013_001E  — Median Household Income
     B25077_001E  — Median Home Value (Owner-Occupied)
     B17001_002E  — Below Poverty Level
     B01002_001E  — Median Age
     B25003_002E  — Owner-Occupied Housing Units
     B25003_003E  — Renter-Occupied Housing Units
   
   Supports: GET /api/market-vitals?zip=30318
   ═══════════════════════════════════════════════════════════════ */

const CENSUS_BASE = 'https://api.census.gov/data';
const CENSUS_KEY = process.env.CENSUS_API_KEY || ''; // Optional — works without key at lower rate limits
const ACS_VARIABLES = [
  'B01003_001E', // Population
  'B19013_001E', // Median HH Income
  'B25077_001E', // Median Home Value
  'B17001_002E', // Below Poverty
  'B01002_001E', // Median Age
  'B25003_002E', // Owner-Occupied
  'B25003_003E', // Renter-Occupied
].join(',');

// ZIP code to ZCTA mapping is 1:1 for the Census API
const AVAILABLE_ACS_YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014];

/**
 * Fetches a single ACS 5-year estimate for a given year and ZIP.
 * Returns null on error instead of throwing — we want partial results.
 */
async function fetchACSYear(
  year: number,
  zip: string,
): Promise<Record<string, number> | null> {
  const keyParam = CENSUS_KEY ? `&key=${CENSUS_KEY}` : '';
  const url = `${CENSUS_BASE}/${year}/acs/acs5?get=${ACS_VARIABLES}&for=zip%20code%20tabulation%20area:${zip}${keyParam}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return null;

    const headers = data[0] as string[];
    const values = data[1] as string[];

    const result: Record<string, number> = {};
    headers.forEach((header, i) => {
      const val = parseInt(values[i], 10);
      result[header] = isNaN(val) ? 0 : val;
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * Derives a 10-year trend array for a specific variable.
 */
function buildTrend(
  yearlyData: Map<number, Record<string, number>>,
  variable: string,
): MarketDataPoint[] {
  const points: MarketDataPoint[] = [];
  for (const [year, data] of yearlyData) {
    if (data[variable] != null && data[variable] > 0) {
      points.push({ year, value: data[variable] });
    }
  }
  return points.sort((a, b) => a.year - b.year);
}

/**
 * Calculates percentage growth between the first and last available points
 * within a given lookback window.
 */
function computeGrowth(trend: MarketDataPoint[], lookbackYears: number): number {
  if (trend.length < 2) return 0;
  const latest = trend[trend.length - 1];
  const cutoffYear = latest.year - lookbackYears;
  const baseline = trend.find((p) => p.year >= cutoffYear) || trend[0];
  if (baseline.value === 0) return 0;
  return Math.round(((latest.value - baseline.value) / baseline.value) * 100 * 100) / 100;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const zip = req.nextUrl.searchParams.get('zip')?.trim();

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'A valid 5-digit ZIP code is required.' },
      { status: 400 },
    );
  }

  // Fetch all available ACS years in parallel
  const yearlyResults = await Promise.all(
    AVAILABLE_ACS_YEARS.map(async (year) => {
      const data = await fetchACSYear(year, zip);
      return { year, data };
    }),
  );

  const yearlyData = new Map<number, Record<string, number>>();
  for (const { year, data } of yearlyResults) {
    if (data) yearlyData.set(year, data);
  }

  if (yearlyData.size === 0) {
    return NextResponse.json(
      { error: `No Census ACS data found for ZIP ${zip}. Verify the ZCTA exists.` },
      { status: 404 },
    );
  }

  // Build trend arrays
  const populationTrend = buildTrend(yearlyData, 'B01003_001E');
  const incomeTrend = buildTrend(yearlyData, 'B19013_001E');

  // Latest year's snapshot
  const latestYear = Math.max(...yearlyData.keys());
  const latest = yearlyData.get(latestYear)!;
  const totalOccupied = (latest['B25003_002E'] || 0) + (latest['B25003_003E'] || 0);
  const ownerPct = totalOccupied > 0
    ? Math.round((latest['B25003_002E'] / totalOccupied) * 100 * 10) / 10
    : 0;

  const demographics: ZipDemographics = {
    zipCode: zip,
    population: populationTrend,
    medianHouseholdIncome: incomeTrend,
    populationGrowth5yr: computeGrowth(populationTrend, 5),
    medianIncomeCurrent: latest['B19013_001E'] || 0,
    medianHomeValue: latest['B25077_001E'] || undefined,
    povertyRate:
      latest['B01003_001E'] > 0
        ? Math.round((latest['B17001_002E'] / latest['B01003_001E']) * 100 * 10) / 10
        : undefined,
    medianAge: latest['B01002_001E'] || undefined,
    ownerOccupiedPct: ownerPct || undefined,
    renterOccupiedPct: totalOccupied > 0 ? Math.round((100 - ownerPct) * 10) / 10 : undefined,
    lastUpdated: new Date().toISOString(),
    source: 'census_acs',
  };

  return NextResponse.json({ demographics });
}
