import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { canonicalSeedDeal } from '@paperworking/financial-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  generateScheduleEReport,
  SCHEDULE_E_LINES_METADATA,
} from '../../lib/reports/schedule-e-mapper.js';
import {
  aggregateVendor1099Payments,
  buildCapExLogReport,
  buildK1AllocationSummary,
  TAX_DISCLAIMER,
} from '../../lib/reports/tax-reports.js';

describe('Audit Suite: Tax Preparation Reports & IRS Compliance', () => {
  const seedProject = {
    projectId: 'prop-canonical-1',
    projectName: 'Oakwood Residence',
    purchasePrice: canonicalSeedDeal.purchase_price,
    propertyValue: canonicalSeedDeal.property_value,
    grossScheduledRentAnnual: canonicalSeedDeal.gross_scheduled_rent,
    vacancyRatePct: canonicalSeedDeal.vacancy_rate,
    otherIncomeAnnual: canonicalSeedDeal.other_income,
    expenses: {
      tax: canonicalSeedDeal.expenses.tax,
      insurance: canonicalSeedDeal.expenses.insurance,
      maintenance: canonicalSeedDeal.expenses.maintenance,
      management: canonicalSeedDeal.expenses.management,
      utilities: canonicalSeedDeal.expenses.utilities,
      security: canonicalSeedDeal.expenses.security,
      HOA: canonicalSeedDeal.expenses.HOA,
      capex: canonicalSeedDeal.expenses.capex,
    },
    debt: {
      loanAmount: canonicalSeedDeal.loan_amount,
      interestRate: canonicalSeedDeal.interest_rate,
      termYears: canonicalSeedDeal.loan_term_years,
    },
    depreciation: {
      landValue: 55800,
      improvementBasis: 223200,
      inServiceDate: '2024-01-01',
      assetClass: 'residential_27_5' as const,
    },
  };

  it('verifies Schedule E statement maps to 14 IRS lines with portfolio totals', () => {
    const report = generateScheduleEReport([seedProject], 2026);

    expect(report.fiscalYear).toBe(2026);
    expect(report.properties.length).toBe(1);
    expect(report.lines.length).toBe(SCHEDULE_E_LINES_METADATA.length);

    // Line 3: Rents Received ($24,000 * 0.97 = $23,280)
    const line3 = report.lines.find((l) => l.lineKey === 'line3_rents')!;
    expect(line3.portfolioTotal).toBe(23280);

    // Line 7: Cleaning & Maintenance receives FULL maintenance ($1,995)
    // (No fabricated 40/60 split — combined input maps wholly to Line 7)
    const line7 = report.lines.find((l) => l.lineKey === 'line7_cleaning_maint')!;
    expect(line7.portfolioTotal).toBe(1995);

    // Line 14: Repairs is $0 when no separate repairs input exists
    const line14 = report.lines.find((l) => l.lineKey === 'line14_repairs')!;
    expect(line14.portfolioTotal).toBe(0);

    // Line 16: Taxes ($3,600)
    const line16 = report.lines.find((l) => l.lineKey === 'line16_taxes')!;
    expect(line16.portfolioTotal).toBe(3600);

    // Line 17: Utilities ($1,000)
    const line17 = report.lines.find((l) => l.lineKey === 'line17_utilities')!;
    expect(line17.portfolioTotal).toBe(1000);

    // Summary net rental income
    expect(report.summary.totalRentsReceived).toBe(23280);
    expect(report.summary.netRentalIncome).toBeDefined();
  });

  it('asserts no fractional multipliers exist in the Schedule E mapper', () => {
    // Read the mapper source and verify no fractional maintenance splits (0.4, 0.6, etc.)
    // This is a structural assertion: the mapper must not invent allocation ratios
    const mapperPath = path.resolve(__dirname, '../../lib/reports/schedule-e-mapper.ts');
    const mapperSource = fs.readFileSync(mapperPath, 'utf-8');
    // No fractional multipliers applied to maintenance or any expense category
    expect(mapperSource).not.toMatch(/maintenance\s*\*\s*0\.\d/);
    expect(mapperSource).not.toMatch(/\*\s*0\.[1-9]/); // No arbitrary ratios anywhere
  });

  it('aggregates 1099 vendor payments and flags the $600 IRS reporting threshold', () => {
    const rawPayments = [
      { vendorName: 'Apex Roofing LLC', category: 'Roof Repair', amount: 1250, date: '2026-03-12' },
      { vendorName: 'Apex Roofing LLC', category: 'Flashing Repair', amount: 350, date: '2026-04-15' },
      { vendorName: 'Quick Clean Janitorial', category: 'Turnover Cleaning', amount: 450, date: '2026-05-10' },
      { vendorName: 'Handy Home Services', category: 'Drywall Patch', amount: 150, date: '2026-06-02' },
    ];

    const rep = aggregateVendor1099Payments(rawPayments, 2026);
    expect(rep.requiresVendorRecords).toBe(false);
    expect(rep.summary.totalVendors).toBe(3);

    const apex = rep.vendors.find((v) => v.vendorName === 'Apex Roofing LLC')!;
    expect(apex.totalPaidYtd).toBe(1600);
    expect(apex.requires1099Nec).toBe(true); // >= $600

    const quickClean = rep.vendors.find((v) => v.vendorName === 'Quick Clean Janitorial')!;
    expect(quickClean.totalPaidYtd).toBe(450);
    expect(quickClean.requires1099Nec).toBe(false); // < $600

    expect(rep.summary.vendorsRequiring1099).toBe(1);
    expect(rep.summary.totalAmountSubjectTo1099).toBe(1600);
  });

  it('returns requiresVendorRecords: true when no vendor transaction data is provided', () => {
    const emptyRep = aggregateVendor1099Payments(undefined, 2026);
    expect(emptyRep.requiresVendorRecords).toBe(true);
    expect(emptyRep.vendors.length).toBe(0);
  });

  it('separates major capital improvements from routine repairs in CapEx Log', () => {
    const projects = [
      {
        id: 'deal-1',
        name: 'Oakwood Apartments',
        rehabCosts: 25000,
        purchaseDate: '2026-01-15',
        expenses: {
          maintenance: 1995,
          capex: 1200,
        },
      },
    ];

    const report = buildCapExLogReport(projects, 2026);
    expect(report.items.length).toBe(3);

    const rehabItem = report.items.find((i) => i.id === 'deal-1-rehab-init')!;
    expect(rehabItem.isCapitalized).toBe(true);
    expect(rehabItem.amount).toBe(25000);
    expect(rehabItem.type).toBe('capital_improvement');

    const maintItem = report.items.find((i) => i.id === 'deal-1-maint-routine')!;
    expect(maintItem.isCapitalized).toBe(false);
    expect(maintItem.amount).toBe(1995);
    expect(maintItem.type).toBe('routine_repair');

    expect(report.summary.capitalizedImprovements).toBe(26200); // 25000 + 1200
    expect(report.summary.routineRepairsExpensed).toBe(1995);
  });

  it('builds K-1 LP/GP allocation summary reusing waterfall engine', () => {
    const summary = buildK1AllocationSummary('Oakwood Syndication', 100000, 90, 15000, 2026);
    expect(summary.hasSyndication).toBe(true);
    expect(summary.lpAllocation.equityInvested).toBe(90000);
    expect(summary.gpAllocation.equityInvested).toBe(10000);
    expect(summary.lpAllocation.totalDistributed).toBeGreaterThan(0);
    expect(summary.waterfallTiers.length).toBeGreaterThan(0);
  });

  it('enforces statutory CPA disclaimer constant', () => {
    expect(TAX_DISCLAIMER).toBe('For planning purposes — not tax advice. Consult a CPA.');
  });

  it('enforces 1099-NEC exact $600 boundary: $599.99 → no flag, $600.00 → flag', () => {
    const payments = [
      // Vendor A: exactly $599.99 (below threshold)
      { vendorName: 'Below Threshold LLC', category: 'Repair', amount: 599.99, date: '2026-06-01' },
      // Vendor B: exactly $600.00 (at threshold)
      { vendorName: 'At Threshold LLC', category: 'Repair', amount: 600.00, date: '2026-07-01' },
      // Vendor C: $600.01 (above threshold, multi-payment)
      { vendorName: 'Above Threshold LLC', category: 'Repair', amount: 300.005, date: '2026-08-01' },
      { vendorName: 'Above Threshold LLC', category: 'Repair', amount: 300.005, date: '2026-09-01' },
    ];

    const rep = aggregateVendor1099Payments(payments, 2026);

    const below = rep.vendors.find((v) => v.vendorName === 'Below Threshold LLC')!;
    expect(below.totalPaidYtd).toBe(599.99);
    expect(below.requires1099Nec).toBe(false); // $599.99 < $600

    const atThreshold = rep.vendors.find((v) => v.vendorName === 'At Threshold LLC')!;
    expect(atThreshold.totalPaidYtd).toBe(600.00);
    expect(atThreshold.requires1099Nec).toBe(true); // $600.00 >= $600

    const above = rep.vendors.find((v) => v.vendorName === 'Above Threshold LLC')!;
    expect(above.requires1099Nec).toBe(true); // $600.01 >= $600

    expect(rep.summary.vendorsRequiring1099).toBe(2); // At + Above
  });

  it('enforces Schedule E mapping completeness: no expense dollars are lost in mapping', () => {
    const report = generateScheduleEReport([seedProject], 2026);

    // All 14 IRS line keys must be present (lines 3, 5–19) + subtotals (20, 21)
    const expectedKeys = [
      'line3_rents', 'line5_advertising', 'line6_auto_travel',
      'line7_cleaning_maint', 'line8_commissions', 'line9_insurance',
      'line10_legal_prof', 'line11_management', 'line12_mortgage_interest',
      'line14_repairs', 'line15_supplies', 'line16_taxes',
      'line17_utilities', 'line18_depreciation', 'line19_other',
      'line20_total_expenses', 'line21_net_income',
    ];
    const actualKeys = report.lines.map((l) => l.lineKey);
    for (const key of expectedKeys) {
      expect(actualKeys).toContain(key);
    }

    // Internal consistency: Line 21 = Line 3 - Line 20 (for each property)
    const line3 = report.lines.find((l) => l.lineKey === 'line3_rents')!;
    const line20 = report.lines.find((l) => l.lineKey === 'line20_total_expenses')!;
    const line21 = report.lines.find((l) => l.lineKey === 'line21_net_income')!;
    expect(Math.abs(line21.portfolioTotal - (line3.portfolioTotal - line20.portfolioTotal))).toBeLessThan(0.02);

    // All engine OpEx inputs accounted for: sum of expense lines 5–19 must equal line 20
    const expenseLineKeys = expectedKeys.filter((k) =>
      k !== 'line3_rents' && k !== 'line20_total_expenses' && k !== 'line21_net_income',
    );
    const sumOfExpenseLines = expenseLineKeys.reduce((acc, key) => {
      const line = report.lines.find((l) => l.lineKey === key)!;
      return acc + line.portfolioTotal;
    }, 0);
    expect(Math.abs(sumOfExpenseLines - line20.portfolioTotal)).toBeLessThan(0.02);
  });
});
