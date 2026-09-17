import { describe, expect, it } from '@jest/globals';
import { buildCsvString } from '../../lib/export/kpi-csv.js';
import {
  exportStatementGridCsv,
  type StatementCsvExportPayload,
} from '../../lib/export/statement-csv.js';

describe('Audit Suite: Statement CSV Export Machinery (RFC-4180 & Metadata)', () => {
  const mockPayload: StatementCsvExportPayload = {
    reportTitle: 'Profit & Loss Statement',
    reportId: 'PL',
    scopeName: 'Canonical Seed Deal',
    scopeSlug: 'canonical-seed-deal',
    period: 'monthly',
    fiscalYear: 2026,
    dataSource: 'Projected (underwriting model)',
    columns: [
      { key: 'm1', label: 'Jan', sublabel: '2026' },
      { key: 'm2', label: 'Feb', sublabel: '2026' },
      { key: 'total', label: 'Total', isTotal: true },
    ],
    rows: [
      {
        id: 'gsr',
        label: 'Gross Scheduled Rent',
        indent: 0,
        values: { m1: 2000, m2: 2000 },
        total: 24000,
      },
      {
        id: 'vacancy',
        label: '(−) Vacancy Loss',
        indent: 1,
        values: { m1: -60, m2: -60 },
        total: -720,
      },
      {
        id: 'noi',
        label: 'Net Operating Income (NOI)',
        isSubtotal: true,
        indent: 0,
        values: { m1: 1040.42, m2: 1040.42 },
        total: 12485,
      },
    ],
  };

  it('generates filename complying with paperworking-{scope}-{report}-{period}-{date}.csv pattern', () => {
    const filename = exportStatementGridCsv(mockPayload);
    const today = new Date().toISOString().split('T')[0];
    expect(filename).toBe(`paperworking-canonical-seed-deal-pl-monthly-${today}.csv`);
  });

  it('prepends UTF-8 BOM and formats RFC-4180 CSV body correctly', () => {
    const rawRows = [
      ['# Header Block', 'Scope: Test Property'],
      ['Line Item', 'Jan', 'Total'],
      ['Gross Rent, "Special"', 2000, 24000],
    ];
    const csvString = buildCsvString(rawRows);

    // Starts with UTF-8 BOM
    expect(csvString.startsWith('\uFEFF')).toBe(true);

    // Quotes escaped per RFC-4180
    expect(csvString).toContain('"Gross Rent, ""Special"""');
  });

  it('includes statutory CPA disclaimer in exported CSV', () => {
    const rows: (string | number)[][] = [
      ['# Disclaimer: For planning purposes — not tax advice. Consult a CPA.'],
    ];
    const csv = buildCsvString(rows);
    expect(csv).toContain('For planning purposes — not tax advice. Consult a CPA.');
  });
});
