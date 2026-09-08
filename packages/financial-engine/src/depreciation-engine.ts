/**
 * Depreciation Engine (@paperworking/financial-engine)
 *
 * Implements IRS-compliant straight-line MACRS depreciation for real estate assets:
 * 1. Residential Rental Property (27.5-year recovery period, IRC Sec. 168(c))
 * 2. Nonresidential Commercial Real Property (39-year recovery period, IRC Sec. 168(c))
 * 3. Qualified Improvements (15-year or custom recovery periods)
 * 4. Mid-Month Convention (IRC Sec. 168(d)(2)): Assets placed in service or disposed of
 *    during any month are treated as placed in service or disposed of at the midpoint of that month.
 * 5. Land vs. Improvement Value Split: Land is non-depreciable. Missing land/improvement
 *    allocation triggers explicit INSUFFICIENT_INPUTS without silent substitution.
 */

export type PropertyRecoveryClass = 'residential_27_5' | 'commercial_39' | 'improvement_15' | 'custom';

export interface DepreciableAsset {
  id: string;
  name: string;
  assetClass: PropertyRecoveryClass;
  totalCostBasis: number;
  landValue?: number | null;
  improvementBasis?: number | null;
  inServiceDate: string | Date; // ISO string or Date
  recoveryPeriodYears?: number; // Defaults based on assetClass if omitted
}

export interface AssetYearDepreciation {
  year: number;
  yearIndex: number; // 1-based year of hold
  startingBasis: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  endingBasis: number;
  isMidMonthYear: boolean;
  activeMonths: number;
}

export interface AssetDepreciationSchedule {
  assetId: string;
  name: string;
  assetClass: PropertyRecoveryClass;
  recoveryPeriodYears: number;
  totalBasis: number;
  landValue: number;
  improvementBasis: number;
  inServiceDate: string;
  annualStraightLineFullYear: number;
  schedule: AssetYearDepreciation[];
}

export interface MultiAssetDepreciationSummary {
  holdPeriodYears: number;
  startYear: number;
  assets: AssetDepreciationSchedule[];
  annualPortfolioTotals: Array<{
    year: number;
    annualDepreciation: number;
    accumulatedDepreciation: number;
    totalEndingBasis: number;
  }>;
}

export interface DepreciationCalculationResult {
  valid: boolean;
  missingInputs?: string[];
  schedule?: AssetDepreciationSchedule;
}

/**
 * Returns the default IRS MACRS recovery period in years for a property class.
 */
export function getDefaultRecoveryPeriodYears(assetClass: PropertyRecoveryClass): number {
  switch (assetClass) {
    case 'residential_27_5':
      return 27.5;
    case 'commercial_39':
      return 39.0;
    case 'improvement_15':
      return 15.0;
    case 'custom':
      return 27.5;
  }
}

/**
 * Resolves improvement basis and validates land vs. improvement split.
 * Invariant: Land is non-depreciable.
 */
export function resolveImprovementBasis(asset: DepreciableAsset): {
  valid: boolean;
  missingInputs?: string[];
  improvementBasis?: number;
  landValue?: number;
} {
  if (asset.improvementBasis !== undefined && asset.improvementBasis !== null && asset.improvementBasis > 0) {
    const land = asset.landValue !== undefined && asset.landValue !== null ? asset.landValue : Math.max(0, asset.totalCostBasis - asset.improvementBasis);
    return {
      valid: true,
      improvementBasis: Number(asset.improvementBasis.toFixed(2)),
      landValue: Number(land.toFixed(2)),
    };
  }

  if (asset.landValue !== undefined && asset.landValue !== null) {
    const basis = Math.max(0, asset.totalCostBasis - asset.landValue);
    return {
      valid: true,
      improvementBasis: Number(basis.toFixed(2)),
      landValue: Number(asset.landValue.toFixed(2)),
    };
  }

  // Missing land/improvement split: do not fabricate
  return {
    valid: false,
    missingInputs: ['landValue', 'improvementBasis'],
  };
}

/**
 * Computes mid-month fraction of annual depreciation for placed-in-service year.
 * Per IRC Sec. 168(d)(2), month placed in service counts for 0.5 month.
 * Months in Year 1 = 12 - serviceMonth + 0.5 (where Jan = 1, Dec = 12).
 */
export function computeMidMonthInServiceFraction(inServiceMonth: number): {
  activeMonths: number;
  fractionOfYear: number;
} {
  const monthClamped = Math.min(12, Math.max(1, inServiceMonth));
  const activeMonths = 12 - monthClamped + 0.5;
  const fractionOfYear = activeMonths / 12;
  return { activeMonths, fractionOfYear };
}

/**
 * Computes full multi-year MACRS straight-line depreciation schedule for a single asset.
 *
 * Golden Example:
 * - Improvement Basis = $1,000,000
 * - Residential 27.5 years -> Full-year annual = $1,000,000 / 27.5 = $36,363.64
 * - Placed in service in January (month 1):
 *   activeMonths = 12 - 1 + 0.5 = 11.5 months
 *   Year 1 = $36,363.636... * (11.5 / 12) = $34,848.48
 * - Placed in service in July (month 7):
 *   activeMonths = 12 - 7 + 0.5 = 5.5 months
 *   Year 1 = $36,363.636... * (5.5 / 12) = $16,666.67
 */
export function computeAssetDepreciationSchedule(
  asset: DepreciableAsset,
  holdYears: number = 5,
  startYear?: number,
): DepreciationCalculationResult {
  const basisResolution = resolveImprovementBasis(asset);
  if (!basisResolution.valid || basisResolution.improvementBasis === undefined || basisResolution.landValue === undefined) {
    return {
      valid: false,
      missingInputs: basisResolution.missingInputs,
    };
  }

  const improvementBasis = basisResolution.improvementBasis;
  const landValue = basisResolution.landValue;
  const recoveryPeriod = asset.recoveryPeriodYears ?? getDefaultRecoveryPeriodYears(asset.assetClass);

  if (improvementBasis <= 0 || recoveryPeriod <= 0 || holdYears <= 0) {
    return {
      valid: false,
      missingInputs: ['valid_basis_or_recovery_period'],
    };
  }

  const inServiceDateObj = typeof asset.inServiceDate === 'string' ? new Date(asset.inServiceDate) : asset.inServiceDate;
  const inServiceYear = inServiceDateObj.getUTCFullYear();
  const inServiceMonth = inServiceDateObj.getUTCMonth() + 1; // 1-indexed (Jan = 1)
  const initialYear = startYear ?? inServiceYear;

  const annualFullYear = Number((improvementBasis / recoveryPeriod).toFixed(2));
  const { activeMonths: yr1ActiveMonths, fractionOfYear: yr1Fraction } = computeMidMonthInServiceFraction(inServiceMonth);

  const schedule: AssetYearDepreciation[] = [];
  let currentAccumulated = 0;
  let currentBasis = improvementBasis;

  for (let yearIdx = 1; yearIdx <= holdYears; yearIdx++) {
    const calendarYear = initialYear + (yearIdx - 1);
    const isYear1 = calendarYear === inServiceYear;
    const isBeforeInService = calendarYear < inServiceYear;

    let annualDep = 0;
    let activeMonths = 0;
    let isMidMonth = false;

    if (isBeforeInService) {
      annualDep = 0;
      activeMonths = 0;
    } else if (isYear1) {
      isMidMonth = true;
      activeMonths = yr1ActiveMonths;
      annualDep = Number(((improvementBasis / recoveryPeriod) * yr1Fraction).toFixed(2));
    } else {
      activeMonths = 12;
      annualDep = annualFullYear;
    }

    // Cap at remaining depreciable basis
    annualDep = Math.min(annualDep, currentBasis);
    currentAccumulated = Number((currentAccumulated + annualDep).toFixed(2));
    const endingBasis = Number((Math.max(0, currentBasis - annualDep)).toFixed(2));

    schedule.push({
      year: calendarYear,
      yearIndex: yearIdx,
      startingBasis: Number(currentBasis.toFixed(2)),
      annualDepreciation: annualDep,
      accumulatedDepreciation: currentAccumulated,
      endingBasis,
      isMidMonthYear: isMidMonth,
      activeMonths,
    });

    currentBasis = endingBasis;
  }

  return {
    valid: true,
    schedule: {
      assetId: asset.id,
      name: asset.name,
      assetClass: asset.assetClass,
      recoveryPeriodYears: recoveryPeriod,
      totalBasis: asset.totalCostBasis,
      landValue,
      improvementBasis,
      inServiceDate: inServiceDateObj.toISOString().split('T')[0],
      annualStraightLineFullYear: annualFullYear,
      schedule,
    },
  };
}

/**
 * Computes multi-asset depreciation schedule combining building and separate capital improvements.
 */
export function computeMultiAssetDepreciationSchedule(
  assets: DepreciableAsset[],
  holdYears: number = 5,
  startYear?: number,
): MultiAssetDepreciationSummary {
  const validSchedules: AssetDepreciationSchedule[] = [];
  const baseYear = startYear ?? (assets.length > 0
    ? (typeof assets[0].inServiceDate === 'string'
        ? new Date(assets[0].inServiceDate).getUTCFullYear()
        : assets[0].inServiceDate.getUTCFullYear())
    : new Date().getUTCFullYear());

  for (const asset of assets) {
    const res = computeAssetDepreciationSchedule(asset, holdYears, baseYear);
    if (res.valid && res.schedule) {
      validSchedules.push(res.schedule);
    }
  }

  const annualPortfolioTotals: MultiAssetDepreciationSummary['annualPortfolioTotals'] = [];

  for (let y = 0; y < holdYears; y++) {
    const currentYear = baseYear + y;
    let annualSum = 0;
    let accumSum = 0;
    let endingBasisSum = 0;

    for (const s of validSchedules) {
      const yearRow = s.schedule.find((r) => r.year === currentYear);
      if (yearRow) {
        annualSum += yearRow.annualDepreciation;
        accumSum += yearRow.accumulatedDepreciation;
        endingBasisSum += yearRow.endingBasis;
      }
    }

    annualPortfolioTotals.push({
      year: currentYear,
      annualDepreciation: Number(annualSum.toFixed(2)),
      accumulatedDepreciation: Number(accumSum.toFixed(2)),
      totalEndingBasis: Number(endingBasisSum.toFixed(2)),
    });
  }

  return {
    holdPeriodYears: holdYears,
    startYear: baseYear,
    assets: validSchedules,
    annualPortfolioTotals,
  };
}
