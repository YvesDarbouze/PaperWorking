export function validateMarketVitalsZip(zip: string | null | undefined): { ok: true; zip: string } | { ok: false; error: string; status: number } {
  const value = zip?.trim() ?? '';
  if (!/^\d{5}$/.test(value)) {
    return { ok: false, error: 'A valid 5-digit ZIP code is required.', status: 400 };
  }
  return { ok: true, zip: value };
}

export function buildTrend(
  yearlyData: Map<number, Record<string, number>>,
  variable: string,
): Array<{ year: number; value: number }> {
  const points: Array<{ year: number; value: number }> = [];
  for (const [year, data] of yearlyData) {
    if (data[variable] != null && data[variable] > 0) {
      points.push({ year, value: data[variable] });
    }
  }
  return points.sort((a, b) => a.year - b.year);
}

export function computeGrowth(trend: Array<{ year: number; value: number }>, lookbackYears: number): number {
  if (trend.length < 2) return 0;
  const latest = trend[trend.length - 1];
  const cutoffYear = latest.year - lookbackYears;
  const baseline = trend.find((p) => p.year >= cutoffYear) || trend[0];
  if (baseline.value === 0) return 0;
  return Math.round(((latest.value - baseline.value) / baseline.value) * 100 * 100) / 100;
}

export function buildZipDemographics(input: {
  zip: string;
  yearlyData: Map<number, Record<string, number>>;
}): Record<string, unknown> {
  const populationTrend = buildTrend(input.yearlyData, 'B01003_001E');
  const incomeTrend = buildTrend(input.yearlyData, 'B19013_001E');
  const latestYear = Math.max(...input.yearlyData.keys());
  const latest = input.yearlyData.get(latestYear)!;
  const totalOccupied = (latest['B25003_002E'] || 0) + (latest['B25003_003E'] || 0);
  const ownerPct =
    totalOccupied > 0 ? Math.round((latest['B25003_002E'] / totalOccupied) * 100 * 10) / 10 : 0;

  return {
    zipCode: input.zip,
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
}
