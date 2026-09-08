/**
 * Financial Statement CSV Export Module (@/lib/export/statement-csv.ts)
 *
 * Implements RFC-4180 CSV export with UTF-8 BOM for accounting statements.
 * Filename format: paperworking-{scope}-{report}-{period}-{date}.csv
 */

import { buildCsvString, slugify, triggerCsvDownload } from './kpi-csv';

export interface StatementExportRow {
  id: string;
  label: string;
  isHeader?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  values: Record<string, number | null | string>;
  total?: number | null | string;
}

export interface StatementCsvExportPayload {
  reportTitle: string;
  reportId: string;
  scopeName: string;
  scopeSlug?: string;
  period: 'monthly' | 'quarterly' | 'annual';
  fiscalYear: number;
  dataSource?: string;
  columns: Array<{ key: string; label: string; sublabel?: string; isTotal?: boolean }>;
  rows: StatementExportRow[];
}

/**
 * Builds rows array and triggers client-side RFC-4180 download with UTF-8 BOM.
 */
export function exportStatementGridCsv(payload: StatementCsvExportPayload): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const sSlug = slugify(payload.scopeSlug || payload.scopeName || 'portfolio');
  const rSlug = slugify(payload.reportId || payload.reportTitle);
  const filename = `paperworking-${sSlug}-${rSlug}-${payload.period}-${dateStr}.csv`;

  const csvRows: (string | number | null | undefined)[][] = [
    // Metadata Header Block
    [`# PaperWorking Financial Statement Export - ${payload.reportTitle}`],
    [`Scope: ${payload.scopeName}`],
    [`Period Granularity: ${payload.period.toUpperCase()}`],
    [`Fiscal Year: ${payload.fiscalYear}`],
    [`Data Source: ${payload.dataSource || 'Projected (underwriting model)'}`],
    [`Exported At: ${new Date().toISOString()}`],
    [], // Blank separator
  ];

  // Table Column Headers: [Line Item, ...periods, Total]
  const tableHeaders = [
    'Line Item',
    ...payload.columns.map((c) => (c.sublabel ? `${c.label} (${c.sublabel})` : c.label)),
  ];
  csvRows.push(tableHeaders);

  // Table Data Rows
  for (const row of payload.rows) {
    if (row.isHeader) {
      // Header section row
      csvRows.push([`--- ${row.label.toUpperCase()} ---`]);
      continue;
    }

    const indentSpaces = '  '.repeat(row.indent || 0);
    const lineLabel = `${indentSpaces}${row.label}`;

    const periodCells = payload.columns.map((col) => {
      if (col.key === 'total') {
        return row.total !== undefined && row.total !== null ? row.total : '—';
      }
      const val = row.values[col.key];
      return val !== undefined && val !== null ? val : '—';
    });

    csvRows.push([lineLabel, ...periodCells]);
  }

  // Statutory Tax Disclaimer footer row
  csvRows.push([]);
  csvRows.push(['# Disclaimer: For planning purposes — not tax advice. Consult a CPA.']);

  const csvContent = buildCsvString(csvRows);
  triggerCsvDownload(csvContent, filename);
  return filename;
}
