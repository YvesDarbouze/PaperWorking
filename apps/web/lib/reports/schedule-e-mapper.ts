/**
 * IRS Schedule E Category Mapper (@/lib/reports/schedule-e-mapper.ts)
 *
 * Strictly maps underwriting & real estate operational line items into the
 * 14 official IRS Form 1040 Schedule E (Part I — Income or Loss From Rental Real Estate) lines.
 *
 * Official Lines (IRS Form 1040 Schedule E):
 * - Line 3: Rents received
 * - Line 5: Advertising
 * - Line 6: Auto and travel
 * - Line 7: Cleaning and maintenance
 * - Line 8: Commissions
 * - Line 9: Insurance
 * - Line 10: Legal and other professional fees
 * - Line 11: Management fees
 * - Line 12: Mortgage interest paid to banks, etc.
 * - Line 14: Repairs
 * - Line 15: Supplies
 * - Line 16: Taxes
 * - Line 17: Utilities
 * - Line 18: Depreciation expense or depletion
 * - Line 19: Other (HOA, Security, Misc)
 * - Line 20: Total expenses
 * - Line 21: Net rental income or loss
 */

import {
  deriveProjectStatementMatrix,
  type ProjectStatementInputs,
} from '@paperworking/financial-engine';

export interface ScheduleELineItem {
  lineNumber: string;
  lineKey: string;
  label: string;
  isIncome?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  valuesByProperty: Record<string, number>; // propertyId -> amount
  portfolioTotal: number;
}

export interface ScheduleEReport {
  fiscalYear: number;
  properties: Array<{ id: string; name: string; address?: string }>;
  lines: ScheduleELineItem[];
  summary: {
    totalRentsReceived: number;
    totalExpenses: number;
    netRentalIncome: number;
  };
}

export const SCHEDULE_E_LINES_METADATA = [
  { lineNumber: 'Line 3', lineKey: 'line3_rents', label: 'Rents received', isIncome: true },
  { lineNumber: 'Line 5', lineKey: 'line5_advertising', label: 'Advertising' },
  { lineNumber: 'Line 6', lineKey: 'line6_auto_travel', label: 'Auto and travel' },
  { lineNumber: 'Line 7', lineKey: 'line7_cleaning_maint', label: 'Cleaning and maintenance' },
  { lineNumber: 'Line 8', lineKey: 'line8_commissions', label: 'Commissions' },
  { lineNumber: 'Line 9', lineKey: 'line9_insurance', label: 'Insurance' },
  { lineNumber: 'Line 10', lineKey: 'line10_legal_prof', label: 'Legal and other professional fees' },
  { lineNumber: 'Line 11', lineKey: 'line11_management', label: 'Management fees' },
  { lineNumber: 'Line 12', lineKey: 'line12_mortgage_interest', label: 'Mortgage interest paid to banks' },
  { lineNumber: 'Line 14', lineKey: 'line14_repairs', label: 'Repairs' },
  { lineNumber: 'Line 15', lineKey: 'line15_supplies', label: 'Supplies' },
  { lineNumber: 'Line 16', lineKey: 'line16_taxes', label: 'Taxes (Property)' },
  { lineNumber: 'Line 17', lineKey: 'line17_utilities', label: 'Utilities' },
  { lineNumber: 'Line 18', lineKey: 'line18_depreciation', label: 'Depreciation expense' },
  { lineNumber: 'Line 19', lineKey: 'line19_other', label: 'Other expenses (HOA, Security, Misc)' },
  { lineNumber: 'Line 20', lineKey: 'line20_total_expenses', label: 'Total expenses (Lines 5–19)', isSubtotal: true },
  { lineNumber: 'Line 21', lineKey: 'line21_net_income', label: 'Net rental income or (loss)', isTotal: true },
] as const;

/**
 * Builds the official 14-line Schedule E statement for projects in a fiscal year.
 */
export function generateScheduleEReport(
  projects: ProjectStatementInputs[],
  fiscalYear: number = 2026,
): ScheduleEReport {
  const propertyCols = projects.map((p) => ({
    id: p.projectId,
    name: p.projectName || p.projectId,
    address: p.projectName,
  }));

  // Derive Year 1 Annual P&L for each property
  const propertyMatrices = projects.map((p) => ({
    projectId: p.projectId,
    inputs: p,
    matrix: deriveProjectStatementMatrix(p, {
      statementType: 'PL',
      granularity: 'annual',
      fiscalYear,
      holdYears: 1,
    }),
  }));

  const lineMap: Record<string, { valuesByProperty: Record<string, number>; portfolioTotal: number }> = {};
  for (const meta of SCHEDULE_E_LINES_METADATA) {
    lineMap[meta.lineKey] = {
      valuesByProperty: {},
      portfolioTotal: 0,
    };
  }

  for (const pm of propertyMatrices) {
    const pId = pm.projectId;
    const inp = pm.inputs;
    const exp = inp.expenses || {};

    // Line 3: Rents received = annualGrossScheduledRent * (1 - vacancyRate) + otherIncome
    const grossRent = inp.grossScheduledRentAnnual || 0;
    const vacancyRate = inp.vacancyRatePct || 0;
    const rentsReceived = Number((grossRent * (1 - vacancyRate / 100)).toFixed(2));

    // Operational mappings
    const advertising = 0;
    const autoTravel = 0;
    // Line 7 & 14: Maintenance mapping — combined maintenance input maps wholly to
    // Line 7 (Cleaning and Maintenance), which is the defensible IRS default for a
    // single combined maintenance figure. No fractional allocation to Line 14 (Repairs).
    // If separate cleaningMaintenance / repairs inputs are provided, use those directly.
    const cleaningMaint = (exp as Record<string, number | undefined>).cleaningMaintenance
      ?? exp.maintenance
      ?? 0;
    const repairs = (exp as Record<string, number | undefined>).repairs ?? 0;
    const commissions = 0;
    const insurance = exp.insurance || 0;
    const legalProf = 0;
    const management = exp.management || 0;

    // Line 12: Mortgage Interest from Amortization schedule in statement matrix
    const interestRow = pm.matrix.rows.find((r) => r.id === 'debt_interest');
    const mortgageInterest = interestRow?.total ? Math.abs(interestRow.total) : 0;

    const supplies = 0;
    const taxes = exp.tax || 0;
    const utilities = exp.utilities || 0;

    // Line 18: Depreciation
    const depRow = pm.matrix.rows.find((r) => r.id === 'depreciation_deduction');
    const depVal = depRow?.total ? Math.abs(depRow.total) : 0;

    const other = (exp.security || 0) + (exp.HOA || 0) + (exp.other || 0);

    const totalExp = Number((
      advertising + autoTravel + cleaningMaint + commissions + insurance +
      legalProf + management + mortgageInterest + repairs + supplies + taxes +
      utilities + depVal + other
    ).toFixed(2));

    const netRentalIncome = Number((rentsReceived - totalExp).toFixed(2));

    lineMap.line3_rents.valuesByProperty[pId] = rentsReceived;
    lineMap.line5_advertising.valuesByProperty[pId] = advertising;
    lineMap.line6_auto_travel.valuesByProperty[pId] = autoTravel;
    lineMap.line7_cleaning_maint.valuesByProperty[pId] = cleaningMaint;
    lineMap.line8_commissions.valuesByProperty[pId] = commissions;
    lineMap.line9_insurance.valuesByProperty[pId] = insurance;
    lineMap.line10_legal_prof.valuesByProperty[pId] = legalProf;
    lineMap.line11_management.valuesByProperty[pId] = management;
    lineMap.line12_mortgage_interest.valuesByProperty[pId] = mortgageInterest;
    lineMap.line14_repairs.valuesByProperty[pId] = repairs;
    lineMap.line15_supplies.valuesByProperty[pId] = supplies;
    lineMap.line16_taxes.valuesByProperty[pId] = taxes;
    lineMap.line17_utilities.valuesByProperty[pId] = utilities;
    lineMap.line18_depreciation.valuesByProperty[pId] = depVal;
    lineMap.line19_other.valuesByProperty[pId] = other;
    lineMap.line20_total_expenses.valuesByProperty[pId] = totalExp;
    lineMap.line21_net_income.valuesByProperty[pId] = netRentalIncome;
  }

  // Calculate portfolio totals
  for (const meta of SCHEDULE_E_LINES_METADATA) {
    const lineEntry = lineMap[meta.lineKey];
    const total = Object.values(lineEntry.valuesByProperty).reduce((a, b) => a + b, 0);
    lineEntry.portfolioTotal = Number(total.toFixed(2));
  }

  const lines: ScheduleELineItem[] = SCHEDULE_E_LINES_METADATA.map((meta) => ({
    lineNumber: meta.lineNumber,
    lineKey: meta.lineKey,
    label: meta.label,
    isIncome: 'isIncome' in meta ? meta.isIncome : undefined,
    isSubtotal: 'isSubtotal' in meta ? meta.isSubtotal : undefined,
    isTotal: 'isTotal' in meta ? meta.isTotal : undefined,
    valuesByProperty: lineMap[meta.lineKey].valuesByProperty,
    portfolioTotal: lineMap[meta.lineKey].portfolioTotal,
  }));

  return {
    fiscalYear,
    properties: propertyCols,
    lines,
    summary: {
      totalRentsReceived: lineMap.line3_rents.portfolioTotal,
      totalExpenses: lineMap.line20_total_expenses.portfolioTotal,
      netRentalIncome: lineMap.line21_net_income.portfolioTotal,
    },
  };
}
