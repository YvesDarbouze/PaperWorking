/**
 * Tax Preparation Reports Module (@/lib/reports/tax-reports.ts)
 *
 * Implements CPA-ready reporting engines for:
 * 1. Form 1099 Vendor Payments ($600 threshold flag for 1099-NEC filing)
 * 2. CapEx Log (Capital improvements vs routine repairs with linked depreciation basis)
 * 3. K-1 Syndication Distribution Summary (reuses waterfall engine)
 * 4. Statutory CPA disclaimer enforcement
 */

import {
  computeDistributionWaterfall,
  type WaterfallInputs,
  type WaterfallResult,
} from '@paperworking/financial-engine';

export const TAX_DISCLAIMER = 'For planning purposes — not tax advice. Consult a CPA.';

export interface Vendor1099Entry {
  vendorId: string;
  vendorName: string;
  serviceCategory: string;
  taxIdStatus: 'on_file' | 'missing';
  w9Status: 'certified' | 'pending';
  totalPaidYtd: number;
  requires1099Nec: boolean; // Flagged true if totalPaidYtd >= 600
  paymentCount: number;
}

export interface Vendor1099Report {
  fiscalYear: number;
  requiresVendorRecords: boolean;
  vendors: Vendor1099Entry[];
  summary: {
    totalVendors: number;
    vendorsRequiring1099: number;
    totalAmountSubjectTo1099: number;
    totalVendorSpend: number;
  };
}

export interface CapExLogItem {
  id: string;
  projectId: string;
  projectName?: string;
  date: string;
  description: string;
  amount: number;
  type: 'capital_improvement' | 'routine_repair';
  assetClass: 'building_27_5' | 'improvement_15' | 'equipment_5' | 'expensed_repair';
  isCapitalized: boolean;
  depreciationRecoveryYears: number;
}

export interface CapExReport {
  fiscalYear: number;
  items: CapExLogItem[];
  summary: {
    totalCapExSpend: number;
    capitalizedImprovements: number;
    routineRepairsExpensed: number;
  };
}

export interface K1AllocationSummary {
  projectName: string;
  fiscalYear: number;
  hasSyndication: boolean;
  totalEquity: number;
  lpAllocation: {
    equityInvested: number;
    equitySharePct: number;
    preferredReturnDistributed: number;
    excessCashDistributed: number;
    totalDistributed: number;
    estimatedOrdinaryIncomeShare: number;
  };
  gpAllocation: {
    equityInvested: number;
    equitySharePct: number;
    carriedInterestPromote: number;
    totalDistributed: number;
    estimatedOrdinaryIncomeShare: number;
  };
  waterfallTiers: WaterfallResult['tiers'];
}

/**
 * Aggregates vendor payments and flags the $600 IRS Form 1099-NEC reporting threshold.
 */
export function aggregateVendor1099Payments(
  rawTransactions?: Array<{
    vendorId?: string;
    vendorName: string;
    category: string;
    amount: number;
    date: string;
  }>,
  fiscalYear: number = 2026,
): Vendor1099Report {
  if (!rawTransactions || rawTransactions.length === 0) {
    return {
      fiscalYear,
      requiresVendorRecords: true,
      vendors: [],
      summary: {
        totalVendors: 0,
        vendorsRequiring1099: 0,
        totalAmountSubjectTo1099: 0,
        totalVendorSpend: 0,
      },
    };
  }

  const vendorMap = new Map<string, Vendor1099Entry>();

  for (const tx of rawTransactions) {
    const key = tx.vendorId || tx.vendorName;
    const existing = vendorMap.get(key) || {
      vendorId: key,
      vendorName: tx.vendorName,
      serviceCategory: tx.category,
      taxIdStatus: 'on_file',
      w9Status: 'certified',
      totalPaidYtd: 0,
      requires1099Nec: false,
      paymentCount: 0,
    };

    existing.totalPaidYtd = Number((existing.totalPaidYtd + tx.amount).toFixed(2));
    existing.paymentCount += 1;
    existing.requires1099Nec = existing.totalPaidYtd >= 600;
    vendorMap.set(key, existing);
  }

  const vendors = Array.from(vendorMap.values());
  const vendorsRequiring1099 = vendors.filter((v) => v.requires1099Nec).length;
  const totalAmountSubjectTo1099 = vendors
    .filter((v) => v.requires1099Nec)
    .reduce((acc, v) => acc + v.totalPaidYtd, 0);
  const totalVendorSpend = vendors.reduce((acc, v) => acc + v.totalPaidYtd, 0);

  return {
    fiscalYear,
    requiresVendorRecords: false,
    vendors,
    summary: {
      totalVendors: vendors.length,
      vendorsRequiring1099,
      totalAmountSubjectTo1099: Number(totalAmountSubjectTo1099.toFixed(2)),
      totalVendorSpend: Number(totalVendorSpend.toFixed(2)),
    },
  };
}

/**
 * Builds CapEx Log separating major capital improvements from routine repairs.
 * Feeds initial rehab budget from project underwriting inputs automatically.
 */
export function buildCapExLogReport(
  projects: Array<{
    id: string;
    name?: string;
    rehabCosts?: number | null;
    purchaseDate?: string | Date | null;
    expenses?: { maintenance?: number; capex?: number };
  }>,
  fiscalYear: number = 2026,
): CapExReport {
  const items: CapExLogItem[] = [];

  for (const p of projects) {
    const pName = p.name || p.id;
    const pDate = p.purchaseDate
      ? (typeof p.purchaseDate === 'string' ? p.purchaseDate : p.purchaseDate.toISOString().split('T')[0])
      : `${fiscalYear}-01-15`;

    // 1. Initial Rehab Budget (Capitalized)
    if (p.rehabCosts && p.rehabCosts > 0) {
      items.push({
        id: `${p.id}-rehab-init`,
        projectId: p.id,
        projectName: pName,
        date: pDate,
        description: 'Initial Acquisition Renovation & Rehab',
        amount: p.rehabCosts,
        type: 'capital_improvement',
        assetClass: 'improvement_15',
        isCapitalized: true,
        depreciationRecoveryYears: 15,
      });
    }

    // 2. Annual CapEx Reserve Replacements (Capitalized)
    if (p.expenses?.capex && p.expenses.capex > 0) {
      items.push({
        id: `${p.id}-capex-reserve`,
        projectId: p.id,
        projectName: pName,
        date: `${fiscalYear}-06-30`,
        description: 'Major Component Replacement Reserve (Roof/HVAC)',
        amount: p.expenses.capex,
        type: 'capital_improvement',
        assetClass: 'improvement_15',
        isCapitalized: true,
        depreciationRecoveryYears: 15,
      });
    }

    // 3. Routine Repairs & Maintenance (Expensed on Schedule E)
    if (p.expenses?.maintenance && p.expenses.maintenance > 0) {
      items.push({
        id: `${p.id}-maint-routine`,
        projectId: p.id,
        projectName: pName,
        date: `${fiscalYear}-12-31`,
        description: 'Annual Routine Maintenance & Minor Repairs',
        amount: p.expenses.maintenance,
        type: 'routine_repair',
        assetClass: 'expensed_repair',
        isCapitalized: false,
        depreciationRecoveryYears: 0,
      });
    }
  }

  const capitalizedImprovements = items
    .filter((i) => i.isCapitalized)
    .reduce((a, b) => a + b.amount, 0);
  const routineRepairsExpensed = items
    .filter((i) => !i.isCapitalized)
    .reduce((a, b) => a + b.amount, 0);
  const totalCapExSpend = items.reduce((a, b) => a + b.amount, 0);

  return {
    fiscalYear,
    items,
    summary: {
      totalCapExSpend: Number(totalCapExSpend.toFixed(2)),
      capitalizedImprovements: Number(capitalizedImprovements.toFixed(2)),
      routineRepairsExpensed: Number(routineRepairsExpensed.toFixed(2)),
    },
  };
}

/**
 * Builds K-1 LP/GP Allocation Summary reusing the institutional waterfall engine.
 */
export function buildK1AllocationSummary(
  projectName: string,
  totalEquity: number,
  lpEquityPct: number,
  distributableCashFlow: number,
  fiscalYear: number = 2026,
): K1AllocationSummary {
  const gpEquityPct = 100 - lpEquityPct;
  const lpEquity = (totalEquity * lpEquityPct) / 100;
  const gpEquity = (totalEquity * gpEquityPct) / 100;

  const waterfallInputs: WaterfallInputs = {
    totalEquity,
    lpEquityPct,
    gpEquityPct,
    preferredReturnPct: 8.0,
    gpPromotePct: 20.0,
    hurdle2Irr: 15.0,
    gpPromote2Pct: 30.0,
    holdPeriodYears: 5,
    annualCashFlow: distributableCashFlow,
  };

  const waterfallRes = computeDistributionWaterfall(waterfallInputs);

  return {
    projectName,
    fiscalYear,
    hasSyndication: totalEquity > 0 && lpEquityPct < 100,
    totalEquity,
    lpAllocation: {
      equityInvested: lpEquity,
      equitySharePct: lpEquityPct,
      preferredReturnDistributed: waterfallRes.lpTotalDistributed,
      excessCashDistributed: 0,
      totalDistributed: waterfallRes.lpTotalDistributed,
      estimatedOrdinaryIncomeShare: Math.round(distributableCashFlow * (lpEquityPct / 100)),
    },
    gpAllocation: {
      equityInvested: gpEquity,
      equitySharePct: gpEquityPct,
      carriedInterestPromote: waterfallRes.gpTotalDistributed,
      totalDistributed: waterfallRes.gpTotalDistributed,
      estimatedOrdinaryIncomeShare: Math.round(distributableCashFlow * (gpEquityPct / 100)),
    },
    waterfallTiers: waterfallRes.tiers,
  };
}
