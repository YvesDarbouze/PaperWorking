/**
 * PaperWorking — Annual CPA Package Engine (RP-3)
 *
 * Provides authoritative calculations for:
 * 1. Schedule E-Mapped Income Statement
 * 2. Depreciation & Asset Schedule (27.5-yr MACRS, mid-month convention, land boundary)
 * 3. Closing Statements & Loan Documents Index
 * 4. Form 1099 Summary ($600 boundary threshold logic)
 * 5. Log Books (Mileage / Travel + REPS Material Participation)
 * 6. One-Click CPA Package PDF / Bundle Generation
 */

import { jsPDF } from 'jspdf';
import { formatCurrency, formatPercent } from './reportEngine';

export const IRS_1099_THRESHOLD = 600;

export type ScheduleELineKey =
  | 'line3_rents'
  | 'line5_advertising'
  | 'line6_autotravel'
  | 'line7_cleaning'
  | 'line8_commissions'
  | 'line9_insurance'
  | 'line10_legal'
  | 'line11_management'
  | 'line12_mortgage_interest'
  | 'line14_repairs'
  | 'line15_taxes'
  | 'line16_utilities'
  | 'line18_depreciation'
  | 'line19_other';

export const SCHEDULE_E_LINE_NAMES: Record<ScheduleELineKey, string> = {
  line3_rents: 'Line 3: Rents Received',
  line5_advertising: 'Line 5: Advertising',
  line6_autotravel: 'Line 6: Auto and Travel',
  line7_cleaning: 'Line 7: Cleaning and Maintenance',
  line8_commissions: 'Line 8: Commissions',
  line9_insurance: 'Line 9: Insurance',
  line10_legal: 'Line 10: Legal and Professional Fees',
  line11_management: 'Line 11: Management Fees',
  line12_mortgage_interest: 'Line 12: Mortgage Interest Paid to Banks',
  line14_repairs: 'Line 14: Repairs',
  line15_taxes: 'Line 15: Taxes',
  line16_utilities: 'Line 16: Utilities',
  line18_depreciation: 'Line 18: Depreciation Expense',
  line19_other: 'Line 19: Other Expenses',
};

/**
 * Strict Mapping Rule: Every expense category maps to EXACTLY ONE IRS Schedule E line.
 * Unmapped categories are impossible (defaults to line19_other).
 */
export function mapCategoryToScheduleELine(category: string): ScheduleELineKey {
  const cat = (category || '').toLowerCase().trim();
  if (cat.includes('rent') || cat.includes('income')) return 'line3_rents';
  if (cat.includes('ad') || cat.includes('market')) return 'line5_advertising';
  if (cat.includes('travel') || cat.includes('mileage') || cat.includes('auto')) return 'line6_autotravel';
  if (cat.includes('clean') || cat.includes('janitorial')) return 'line7_cleaning';
  if (cat.includes('commission') || cat.includes('agent')) return 'line8_commissions';
  if (cat.includes('insur')) return 'line9_insurance';
  if (cat.includes('legal') || cat.includes('attorney') || cat.includes('prof') || cat.includes('cpa')) return 'line10_legal';
  if (cat.includes('manage') || cat.includes('pm')) return 'line11_management';
  if (cat.includes('interest') || cat.includes('mortgage')) return 'line12_mortgage_interest';
  if (cat.includes('repair') || cat.includes('maint')) return 'line14_repairs';
  if (cat.includes('tax')) return 'line15_taxes';
  if (cat.includes('util') || cat.includes('electric') || cat.includes('water') || cat.includes('gas')) return 'line16_utilities';
  if (cat.includes('deprec')) return 'line18_depreciation';
  return 'line19_other';
}

export type ScheduleELineValue = number | null;

export interface ScheduleEReportData {
  title: string;
  taxYear: number;
  dataThroughDate: string;
  lineTotals: Record<ScheduleELineKey, ScheduleELineValue>;
  totalIncome: number | null;
  totalExpenses: number | null;
  netIncome: number | null;
  properties: Array<{
    projectId: string;
    propertyName: string;
    lineItems: Record<ScheduleELineKey, ScheduleELineValue>;
  }>;
}

export interface DepreciationAssetEntry {
  projectId: string;
  propertyName: string;
  acquisitionDate: string | null;
  totalCostBasis: number | null;
  landValue: number | null;
  buildingCostBasis: number | null;
  placedInServiceDate: string | null;
  recoveryPeriodYears: number;
  depreciationMethod: string;
  priorAccumulatedDepreciation: number | null;
  currentYearDepreciation: number | null;
  endingAccumulatedDepreciation: number | null;
  remainingBasis: number | null;
  isComplete: boolean;
  missingFields: string[];
}

export interface DepreciationScheduleData {
  title: string;
  taxYear: number;
  dataThroughDate: string;
  totalBuildingBasis: number | null;
  totalCurrentYearDepreciation: number | null;
  totalAccumulatedDepreciation: number | null;
  assets: DepreciationAssetEntry[];
}

export interface ClosingDocumentIndexEntry {
  projectId: string;
  propertyName: string;
  documentType: 'HUD-1 Settlement Statement' | 'Closing Disclosure' | 'Promissory Note' | 'Deed of Trust' | string;
  documentName: string;
  fileId: string;
  fileUrl: string;
  transactionDate: string;
  transactionType: 'Acquisition' | 'Refinance' | 'Disposition' | string;
}

export interface ClosingDocumentIndexData {
  title: string;
  taxYear: number;
  dataThroughDate: string;
  documents: ClosingDocumentIndexEntry[];
}

export interface Form1099VendorEntry {
  vendorId: string;
  vendorName: string;
  einOrSsnProvided: boolean;
  totalPaid: number;
  requires1099: boolean; // totalPaid >= 600
  formType: '1099-NEC' | '1099-MISC';
}

export interface Form1099SummaryData {
  title: string;
  taxYear: number;
  dataThroughDate: string;
  thresholdAmount: number;
  totalVendors: number;
  vendorsRequiring1099Count: number;
  totalReportablePayments: number;
  vendors: Form1099VendorEntry[];
  isRecorded: boolean;
}

export interface MileageLogEntry {
  id: string;
  date: string;
  propertyName: string;
  purpose: string;
  miles: number;
  deductionAmount: number; // miles * rate
}

export interface TimeLogEntry {
  id: string;
  date: string;
  propertyName: string;
  activity: string;
  hours: number;
}

export interface LogBooksData {
  title: string;
  taxYear: number;
  dataThroughDate: string;
  standardMileageRate: number; // 0.67
  totalMiles: number | null;
  totalMileageDeduction: number | null;
  repsThresholdHours: number; // 750 hours
  totalREPSHours: number | null;
  isREPSMet: boolean;
  isMileageRecorded: boolean;
  isREPSTimeRecorded: boolean;
  mileageLogs: MileageLogEntry[];
  timeLogs: TimeLogEntry[];
}

export interface CPAPackageBundleData {
  accountName: string;
  taxYear: number;
  dataThroughDate: string;
  propertyRosterCount: number;
  scheduleE: ScheduleEReportData;
  depreciation: DepreciationScheduleData;
  closingDocs: ClosingDocumentIndexData;
  form1099: Form1099SummaryData;
  logBooks: LogBooksData;
}

// ── Helper Utilities ──────────────────────────────────────────────────────

export function extractNumberOrNull(val: any): number | null {
  if (typeof val === 'number' && !isNaN(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ── Depreciation Engine ───────────────────────────────────────────────────

export function calculateAssetDepreciation(
  totalCostBasis: number,
  landValue: number,
  placedInServiceDate: string,
  taxYear: number,
  priorAccumulatedDepreciation: number = 0,
  recoveryPeriodYears: number = 27.5
): {
  buildingCostBasis: number;
  currentYearDepreciation: number;
  endingAccumulatedDepreciation: number;
  remainingBasis: number;
} {
  const buildingCostBasis = Math.max(0, totalCostBasis - landValue);
  if (buildingCostBasis <= 0) {
    return {
      buildingCostBasis: 0,
      currentYearDepreciation: 0,
      endingAccumulatedDepreciation: priorAccumulatedDepreciation,
      remainingBasis: 0,
    };
  }

  const dateParts = (placedInServiceDate || `${taxYear}-01-01`).split('T')[0].split('-').map(Number);
  const placedYear = dateParts[0] || taxYear;
  const monthIndex = (dateParts[1] || 1) - 1; // 0-indexed: 0 = Jan, 11 = Dec

  if (placedYear > taxYear) {
    return {
      buildingCostBasis,
      currentYearDepreciation: 0,
      endingAccumulatedDepreciation: 0,
      remainingBasis: buildingCostBasis,
    };
  }

  const annualDepreciation = buildingCostBasis / recoveryPeriodYears;

  let currentYearDepreciation = 0;
  if (placedYear === taxYear) {
    // Mid-month convention: month 1 (Jan, index 0) gets 11.5 months; month 12 (Dec, index 11) gets 0.5 months
    const activeMonthsFirstYear = Math.max(0.5, 12 - monthIndex - 0.5);
    currentYearDepreciation = (annualDepreciation / 12) * activeMonthsFirstYear;
  } else {
    currentYearDepreciation = annualDepreciation;
  }

  currentYearDepreciation = Math.round(currentYearDepreciation * 100) / 100;
  const endingAccumulatedDepreciation = Math.round((priorAccumulatedDepreciation + currentYearDepreciation) * 100) / 100;
  const remainingBasis = Math.max(0, Math.round((buildingCostBasis - endingAccumulatedDepreciation) * 100) / 100);

  return {
    buildingCostBasis,
    currentYearDepreciation,
    endingAccumulatedDepreciation,
    remainingBasis,
  };
}

// ── 1099 Threshold Logic ──────────────────────────────────────────────────

export function evaluateVendor1099Requirement(totalPaid: number): boolean {
  return totalPaid >= IRS_1099_THRESHOLD;
}

// ── Generators ────────────────────────────────────────────────────────────

export function generateScheduleEReport(projects: any[], taxYear: number = 2025): ScheduleEReportData {
  const dataThroughDate = new Date().toISOString().split('T')[0];
  const lineTotals: Record<ScheduleELineKey, ScheduleELineValue> = {
    line3_rents: null,
    line5_advertising: null,
    line6_autotravel: null,
    line7_cleaning: null,
    line8_commissions: null,
    line9_insurance: null,
    line10_legal: null,
    line11_management: null,
    line12_mortgage_interest: null,
    line14_repairs: null,
    line15_taxes: null,
    line16_utilities: null,
    line18_depreciation: null,
    line19_other: null,
  };

  const propertyEntries: ScheduleEReportData['properties'] = [];

  for (const p of projects) {
    const fin = p.financials || {};

    const rawRent = extractNumberOrNull(fin.monthlyGrossRent);
    const rent = rawRent !== null ? rawRent * 12 : null;

    const rawUtil = extractNumberOrNull(fin.holdingCostUtilities);
    const utilities = rawUtil !== null ? rawUtil * 12 : null;

    const rawRepairs = extractNumberOrNull(fin.monthlyMaintenanceReserve);
    const repairs = rawRepairs !== null ? rawRepairs * 12 : null;

    const rawMgmtPct = extractNumberOrNull(fin.propertyManagementFeePercent);
    const mgmt = (rent !== null && rawMgmtPct !== null) ? Math.round(rent * (rawMgmtPct / 100)) : null;

    const rawTaxes = extractNumberOrNull(fin.holdingCostTaxes);
    const taxes = rawTaxes !== null ? rawTaxes * 12 : null;

    const rawIns = extractNumberOrNull(fin.holdingCostInsurance);
    const insurance = rawIns !== null ? rawIns * 12 : null;

    const rawLoan = extractNumberOrNull(fin.loanAmount);
    const rawRate = extractNumberOrNull(fin.loanInterestRate);
    const mortgageInterest = (rawLoan !== null && rawRate !== null)
      ? Math.round(rawLoan * (rawRate / 100))
      : null;

    const rawPrice = extractNumberOrNull(fin.purchasePrice);
    const rawLand = extractNumberOrNull(fin.landValue);
    const landVal = rawLand !== null ? rawLand : (rawPrice !== null ? Math.round(rawPrice * 0.2) : null);
    const acqDate = p.acquisitionDate || null;
    const rawPriorDep = extractNumberOrNull(fin.priorAccumulatedDepreciation) ?? 0;

    const dep = (rawPrice !== null && landVal !== null && acqDate !== null)
      ? calculateAssetDepreciation(rawPrice, landVal, acqDate, taxYear, rawPriorDep).currentYearDepreciation
      : null;

    const lineItems: Record<ScheduleELineKey, ScheduleELineValue> = {
      line3_rents: rent,
      line5_advertising: extractNumberOrNull(fin.advertising),
      line6_autotravel: extractNumberOrNull(fin.autoTravel),
      line7_cleaning: extractNumberOrNull(fin.cleaning),
      line8_commissions: extractNumberOrNull(fin.commissions),
      line9_insurance: insurance,
      line10_legal: extractNumberOrNull(fin.legal),
      line11_management: mgmt,
      line12_mortgage_interest: mortgageInterest,
      line14_repairs: repairs,
      line15_taxes: taxes,
      line16_utilities: utilities,
      line18_depreciation: dep,
      line19_other: extractNumberOrNull(fin.otherExpenses),
    };

    for (const [key, val] of Object.entries(lineItems)) {
      const lineKey = key as ScheduleELineKey;
      if (val !== null) {
        lineTotals[lineKey] = (lineTotals[lineKey] ?? 0) + val;
      }
    }

    propertyEntries.push({
      projectId: p.id,
      propertyName: p.propertyName || p.name || 'Unnamed Property',
      lineItems,
    });
  }

  const totalIncome = lineTotals.line3_rents;

  let totalExpenses: number | null = null;
  for (const [k, val] of Object.entries(lineTotals)) {
    if (k !== 'line3_rents' && val !== null) {
      totalExpenses = (totalExpenses ?? 0) + val;
    }
  }

  const netIncome = (totalIncome !== null || totalExpenses !== null)
    ? (totalIncome ?? 0) - (totalExpenses ?? 0)
    : null;

  return {
    title: 'Schedule E-Mapped Income Statement',
    taxYear,
    dataThroughDate,
    lineTotals,
    totalIncome,
    totalExpenses,
    netIncome,
    properties: propertyEntries,
  };
}

export function generateDepreciationSchedule(projects: any[], taxYear: number = 2025): DepreciationScheduleData {
  const dataThroughDate = new Date().toISOString().split('T')[0];
  const assets: DepreciationAssetEntry[] = [];

  let totalBuildingBasis: number | null = null;
  let totalCurrentYearDepreciation: number | null = null;
  let totalAccumulatedDepreciation: number | null = null;

  for (const p of projects) {
    const fin = p.financials || {};
    const missingFields: string[] = [];

    const totalCostBasis = extractNumberOrNull(fin.purchasePrice);
    if (totalCostBasis === null) missingFields.push('purchasePrice');

    const acqDate = p.acquisitionDate || p.createdAt?.split('T')[0] || null;
    if (acqDate === null) missingFields.push('acquisitionDate');

    const rawLand = extractNumberOrNull(fin.landValue);
    const landValue = rawLand !== null
      ? rawLand
      : (totalCostBasis !== null ? Math.round(totalCostBasis * 0.2) : null);

    const priorDep = extractNumberOrNull(fin.priorAccumulatedDepreciation) ?? 0;

    let buildingCostBasis: number | null = null;
    let currentYearDepreciation: number | null = null;
    let endingAccumulatedDepreciation: number | null = null;
    let remainingBasis: number | null = null;
    const isComplete = missingFields.length === 0;

    if (isComplete && totalCostBasis !== null && landValue !== null && acqDate !== null) {
      const dep = calculateAssetDepreciation(totalCostBasis, landValue, acqDate, taxYear, priorDep, 27.5);
      buildingCostBasis = dep.buildingCostBasis;
      currentYearDepreciation = dep.currentYearDepreciation;
      endingAccumulatedDepreciation = dep.endingAccumulatedDepreciation;
      remainingBasis = dep.remainingBasis;

      totalBuildingBasis = (totalBuildingBasis ?? 0) + buildingCostBasis;
      totalCurrentYearDepreciation = (totalCurrentYearDepreciation ?? 0) + currentYearDepreciation;
      totalAccumulatedDepreciation = (totalAccumulatedDepreciation ?? 0) + endingAccumulatedDepreciation;
    }

    assets.push({
      projectId: p.id,
      propertyName: p.propertyName || p.name || 'Unnamed Property',
      acquisitionDate: acqDate,
      totalCostBasis,
      landValue,
      buildingCostBasis,
      placedInServiceDate: acqDate,
      recoveryPeriodYears: 27.5,
      depreciationMethod: 'Straight Line (MACRS 27.5)',
      priorAccumulatedDepreciation: priorDep,
      currentYearDepreciation,
      endingAccumulatedDepreciation,
      remainingBasis,
      isComplete,
      missingFields,
    });
  }

  return {
    title: 'Depreciation & Asset Schedule',
    taxYear,
    dataThroughDate,
    totalBuildingBasis,
    totalCurrentYearDepreciation,
    totalAccumulatedDepreciation,
    assets,
  };
}

export function generateClosingDocumentIndex(projects: any[], taxYear: number = 2025): ClosingDocumentIndexData {
  const dataThroughDate = new Date().toISOString().split('T')[0];
  const documents: ClosingDocumentIndexEntry[] = [];

  for (const p of projects) {
    if (Array.isArray(p.documents)) {
      for (const doc of p.documents) {
        if (doc.type?.includes('HUD') || doc.type?.includes('Closing') || doc.type?.includes('Note') || doc.type?.includes('Deed')) {
          documents.push({
            projectId: p.id,
            propertyName: p.propertyName || p.name || 'Unnamed Property',
            documentType: doc.type,
            documentName: doc.name || `${doc.type}_${p.propertyName || 'Property'}.pdf`,
            fileId: doc.id || `file-${p.id}`,
            fileUrl: doc.url || `/dashboard/projects/${p.id}/files`,
            transactionDate: doc.date || p.acquisitionDate || `${taxYear}-01-01`,
            transactionType: doc.transactionType || 'Acquisition',
          });
        }
      }
    }
  }

  return {
    title: 'Closing Statements & Loan Documents Index',
    taxYear,
    dataThroughDate,
    documents,
  };
}

export function generateForm1099Summary(projects: any[], taxYear: number = 2025): Form1099SummaryData {
  const dataThroughDate = new Date().toISOString().split('T')[0];
  const vendorMap = new Map<string, Form1099VendorEntry>();
  let hasVendorRecords = false;

  for (const p of projects) {
    if (Array.isArray(p.vendors) && p.vendors.length > 0) {
      hasVendorRecords = true;
      for (const v of p.vendors) {
        const key = v.vendorId || v.id || v.name || 'unnamed';
        const existing = vendorMap.get(key);
        const paid = Number(v.totalPaid || v.amount || 0);
        if (existing) {
          existing.totalPaid += paid;
          existing.requires1099 = evaluateVendor1099Requirement(existing.totalPaid);
        } else {
          const entryPaid = paid;
          vendorMap.set(key, {
            vendorId: v.vendorId || v.id || `v-${Math.random().toString(36).substr(2, 5)}`,
            vendorName: v.vendorName || v.name || 'Unnamed Vendor',
            einOrSsnProvided: Boolean(v.ein || v.ssn || v.taxIdProvided),
            totalPaid: entryPaid,
            requires1099: evaluateVendor1099Requirement(entryPaid),
            formType: v.formType || '1099-NEC',
          });
        }
      }
    }
  }

  const vendors = Array.from(vendorMap.values());
  const vendorsRequiring1099Count = vendors.filter(v => v.requires1099).length;
  const totalReportablePayments = vendors
    .filter(v => v.requires1099)
    .reduce((sum, v) => sum + v.totalPaid, 0);

  return {
    title: 'Form 1099 Contractor Summary',
    taxYear,
    dataThroughDate,
    thresholdAmount: IRS_1099_THRESHOLD,
    totalVendors: vendors.length,
    vendorsRequiring1099Count,
    totalReportablePayments,
    vendors,
    isRecorded: hasVendorRecords,
  };
}

export function generateLogBooks(projects: any[], taxYear: number = 2025): LogBooksData {
  const dataThroughDate = new Date().toISOString().split('T')[0];
  const rate = 0.67; // IRS standard mileage rate ($0.67/mi)

  const mileageLogs: MileageLogEntry[] = [];
  const timeLogs: TimeLogEntry[] = [];
  let isMileageRecorded = false;
  let isREPSTimeRecorded = false;

  for (const p of projects) {
    if (Array.isArray(p.mileageLogs) && p.mileageLogs.length > 0) {
      isMileageRecorded = true;
      for (const m of p.mileageLogs) {
        const miles = Number(m.miles || 0);
        mileageLogs.push({
          id: m.id || `m-${Math.random().toString(36).substr(2, 5)}`,
          date: m.date || `${taxYear}-01-01`,
          propertyName: p.propertyName || p.name || 'Unnamed Property',
          purpose: m.purpose || 'Business Travel',
          miles,
          deductionAmount: Math.round(miles * rate * 100) / 100,
        });
      }
    }

    if (Array.isArray(p.timeLogs) && p.timeLogs.length > 0) {
      isREPSTimeRecorded = true;
      for (const t of p.timeLogs) {
        timeLogs.push({
          id: t.id || `t-${Math.random().toString(36).substr(2, 5)}`,
          date: t.date || `${taxYear}-01-01`,
          propertyName: p.propertyName || p.name || 'Unnamed Property',
          activity: t.activity || 'Property Management',
          hours: Number(t.hours || 0),
        });
      }
    }
  }

  const totalMiles = isMileageRecorded ? mileageLogs.reduce((sum, m) => sum + m.miles, 0) : null;
  const totalMileageDeduction = isMileageRecorded ? mileageLogs.reduce((sum, m) => sum + m.deductionAmount, 0) : null;
  const totalREPSHours = isREPSTimeRecorded ? timeLogs.reduce((sum, t) => sum + t.hours, 0) : null;
  const isREPSMet = totalREPSHours !== null && totalREPSHours >= 750;

  return {
    title: 'Log Books (Mileage & REPS Time Tracking)',
    taxYear,
    dataThroughDate,
    standardMileageRate: rate,
    totalMiles,
    totalMileageDeduction,
    repsThresholdHours: 750,
    totalREPSHours,
    isREPSMet,
    isMileageRecorded,
    isREPSTimeRecorded,
    mileageLogs,
    timeLogs,
  };
}

export function generateOneClickCPAPackage(
  projects: any[],
  accountName: string = 'PaperWorkingInvestor Account',
  taxYear: number = 2025
): CPAPackageBundleData {
  const dataThroughDate = new Date().toISOString().split('T')[0];

  return {
    accountName,
    taxYear,
    dataThroughDate,
    propertyRosterCount: projects.length,
    scheduleE: generateScheduleEReport(projects, taxYear),
    depreciation: generateDepreciationSchedule(projects, taxYear),
    closingDocs: generateClosingDocumentIndex(projects, taxYear),
    form1099: generateForm1099Summary(projects, taxYear),
    logBooks: generateLogBooks(projects, taxYear),
  };
}

export function exportCPAPackagePDF(bundle: CPAPackageBundleData): string {
  const doc = new jsPDF();
  const margin = 14;

  // Cover Sheet Banner
  doc.setFillColor(18, 16, 20);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ANNUAL CPA TAX PREPARATION PACKAGE', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(160, 160, 160);
  doc.text(`Account: ${bundle.accountName}  ·  Tax Year: ${bundle.taxYear}`, margin, 28);
  doc.text(`Data through: ${bundle.dataThroughDate}  ·  Properties in Roster: ${bundle.propertyRosterCount}`, margin, 36);

  let y = 60;

  // Schedule E Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('1. 1040 Schedule E Income & Expenses', margin, y); y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Rental Income (Line 3): ${formatCurrency(bundle.scheduleE.totalIncome)}`, margin, y); y += 6;
  doc.text(`Total Operating Expenses: ${formatCurrency(bundle.scheduleE.totalExpenses)}`, margin, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Schedule E Taxable Income: ${formatCurrency(bundle.scheduleE.netIncome)}`, margin, y); y += 14;

  // Depreciation Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Depreciation & Asset Schedule (27.5-Yr MACRS)', margin, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Building Cost Basis: ${formatCurrency(bundle.depreciation.totalBuildingBasis)}`, margin, y); y += 6;
  doc.text(`Current Year Depreciation: ${formatCurrency(bundle.depreciation.totalCurrentYearDepreciation)}`, margin, y); y += 14;

  // Form 1099 Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Form 1099 Contractor Summary ($600 Threshold)', margin, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Vendors Requiring 1099: ${bundle.form1099.vendorsRequiring1099Count} of ${bundle.form1099.totalVendors}`, margin, y); y += 6;
  doc.text(`Total Reportable 1099 Payments: ${formatCurrency(bundle.form1099.totalReportablePayments)}`, margin, y); y += 14;

  // Log Books Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. Mileage & REPS Material Participation Log', margin, y); y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Mileage Deduction (${bundle.logBooks.totalMiles} miles @ $0.67/mi): ${formatCurrency(bundle.logBooks.totalMileageDeduction)}`, margin, y); y += 6;
  doc.text(`REPS Status (750-hr threshold): ${bundle.logBooks.totalREPSHours} Hours logged (${bundle.logBooks.isREPSMet ? 'QUALIFIED ✓' : 'Pending'})`, margin, y);

  // Footer Stamp
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated via PaperWorking Annual CPA Package Engine  ·  Tax Year ${bundle.taxYear}`, margin, 287);

  const filename = `CPA_Package_${bundle.taxYear}_${bundle.dataThroughDate}.pdf`;
  doc.save(filename);
  return filename;
}
