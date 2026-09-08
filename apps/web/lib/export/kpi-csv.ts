/**
 * Client-side CSV generation & export for PaperWorking Underwriting KPIs.
 * Strictly complies with RFC-4180 escaping and prepends UTF-8 BOM for Excel compatibility.
 */

export interface CsvExportMetadata {
  kpiName?: string;
  kpiSlug?: string;
  phase?: string;
  projectName?: string;
  projectSlug?: string;
  period: 'monthly' | 'quarterly' | 'annual';
  exportedAt?: string;
}

/**
 * Escapes a cell value per RFC-4180 standards:
 * - Null/undefined becomes empty string.
 * - If string contains comma, quote, or newline, escape quotes and wrap in double quotes.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Encodes an array of rows into an RFC-4180 CSV string with UTF-8 BOM.
 */
export function buildCsvString(rows: (string | number | null | undefined)[][]): string {
  const BOM = '\uFEFF';
  const csvBody = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  return `${BOM}${csvBody}`;
}

/**
 * Sanitizes a string for use in a file name slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Triggers a browser download of CSV content with the specified filename.
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface WaterfallExportTier {
  tierNumber: number;
  name: string;
  threshold: string;
  lpSplit: string;
  gpSplit: string;
  lpAmount: number;
  gpAmount: number;
  totalAmount: number;
}

export interface WaterfallExportData {
  totalEquity: number;
  lpEquity: number;
  gpEquity: number;
  lpEquityPct: number;
  gpEquityPct: number;
  lpIrr: number | null;
  gpIrr: number | null;
  lpEquityMultiple: number | null;
  gpEquityMultiple: number | null;
  tiers: WaterfallExportTier[];
}

export interface SingleKpiCsvPayload {
  kpi: {
    number: number;
    name: string;
    id: string;
    phase: string;
    unit: string;
    definition: string;
    formulaTemplate: string;
    inputs: Array<{ name: string; source: string }>;
  };
  rawValue: number | null;
  formattedValue: string;
  substitutedFormula: string;
  inputsProvenance: Array<{
    name: string;
    source: string;
    value: string | number | null;
    isAvailable: boolean;
  }>;
  trendSeries?: Array<{ label: string; value: number; isProjected: boolean }>;
  sensitivityData?: Array<{ scenario: string; value: number; formatted: string }>;
  waterfallData?: WaterfallExportData;
  period: 'monthly' | 'quarterly' | 'annual';
  projectName?: string;
  projectSlug?: string;
}

/**
 * Generates and triggers download of a single KPI's detailed CSV report.
 * Filename pattern: paperworking-{projectSlug}-{kpiSlug}-{YYYY-MM-DD}.csv
 */
export function exportSingleKpiCsv(payload: SingleKpiCsvPayload): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const pSlug = slugify(payload.projectSlug || payload.projectName || 'portfolio');
  const kSlug = slugify(payload.kpi.id || payload.kpi.name);
  const filename = `paperworking-${pSlug}-${kSlug}-${dateStr}.csv`;

  const rows: (string | number | null | undefined)[][] = [
    // Metadata Header Row
    [
      `# PaperWorking KPI Export - KPI: ${payload.kpi.name}`,
      `Phase: ${payload.kpi.phase}`,
      `Project: ${payload.projectName || 'Portfolio Aggregate'}`,
      `Period: ${payload.period}`,
      `ExportedAt: ${new Date().toISOString()}`,
    ],
    [],
    // Summary
    ['METRIC SUMMARY', 'VALUE', 'FORMATTED', 'UNIT'],
    [payload.kpi.name, payload.rawValue, payload.formattedValue, payload.kpi.unit],
    [],
    // Definition & Formula
    ['DEFINITION', payload.kpi.definition],
    ['FORMULA TEMPLATE', payload.kpi.formulaTemplate],
    ['LIVE SUBSTITUTED EQUATION', payload.substitutedFormula],
    [],
    // Input Provenance
    ['INPUT PROVENANCE', 'ENTRY SOURCE', 'LIVE VALUE', 'STATUS'],
  ];

  payload.inputsProvenance.forEach((inp) => {
    rows.push([
      inp.name,
      inp.source,
      inp.value ?? '—',
      inp.isAvailable ? 'Populated' : 'Not yet collected — add in Project',
    ]);
  });

  // Time Series (if available)
  if (payload.trendSeries && payload.trendSeries.length > 0) {
    rows.push([]);
    rows.push(['TIME SERIES (24 MONTHS)', 'VALUE', 'DATA TYPE']);
    payload.trendSeries.forEach((pt) => {
      rows.push([pt.label, pt.value, pt.isProjected ? 'Projected' : 'Actual']);
    });
  }

  // Sensitivity Matrix (if available)
  if (payload.sensitivityData && payload.sensitivityData.length > 0) {
    rows.push([]);
    rows.push(['SENSITIVITY SCENARIO', 'RAW VALUE', 'FORMATTED VALUE']);
    payload.sensitivityData.forEach((sc) => {
      rows.push([sc.scenario, sc.value, sc.formatted]);
    });
  }

  // Waterfall Breakdown (if available)
  if (payload.waterfallData) {
    rows.push([]);
    rows.push(['WATERFALL & PROMOTE BREAKDOWN', 'LP', 'GP', 'TOTAL']);
    rows.push([
      'Equity Invested',
      `$${Math.round(payload.waterfallData.lpEquity).toLocaleString('en-US')}`,
      `$${Math.round(payload.waterfallData.gpEquity).toLocaleString('en-US')}`,
      `$${Math.round(payload.waterfallData.totalEquity).toLocaleString('en-US')}`,
    ]);
    rows.push([
      'Equity Share %',
      `${payload.waterfallData.lpEquityPct}%`,
      `${payload.waterfallData.gpEquityPct}%`,
      '100%',
    ]);
    rows.push([
      'Equity Multiple',
      payload.waterfallData.lpEquityMultiple !== null ? `${payload.waterfallData.lpEquityMultiple.toFixed(2)}x` : '—',
      payload.waterfallData.gpEquityMultiple !== null ? `${payload.waterfallData.gpEquityMultiple.toFixed(2)}x` : '—',
      '—',
    ]);
    rows.push([
      'Levered IRR',
      payload.waterfallData.lpIrr !== null ? `${payload.waterfallData.lpIrr.toFixed(1)}%` : '—',
      payload.waterfallData.gpIrr !== null ? `${payload.waterfallData.gpIrr.toFixed(1)}%` : '—',
      '—',
    ]);
    rows.push([]);
    rows.push(['WATERFALL TIERS', 'THRESHOLD / DESCRIPTION', 'LP SPLIT', 'GP SPLIT', 'LP DISTRIBUTED', 'GP DISTRIBUTED', 'TOTAL DISTRIBUTED']);
    payload.waterfallData.tiers.forEach((t) => {
      rows.push([
        t.name,
        t.threshold,
        t.lpSplit,
        t.gpSplit,
        `$${Math.round(t.lpAmount).toLocaleString('en-US')}`,
        `$${Math.round(t.gpAmount).toLocaleString('en-US')}`,
        `$${Math.round(t.totalAmount).toLocaleString('en-US')}`,
      ]);
    });
  }

  const csvString = buildCsvString(rows);
  triggerCsvDownload(csvString, filename);
  return filename;
}

export interface BulkKpiExportItem {
  number: number;
  name: string;
  id: string;
  phase: string;
  category?: string;
  unit: string;
  rawValue: number | null;
  formattedValue: string;
  formulaTemplate: string;
  inputsList: string;
}

export interface BulkKpiCsvPayload {
  kpis: BulkKpiExportItem[];
  period: 'monthly' | 'quarterly' | 'annual';
  projectCount: number;
  projectName?: string;
  projectSlug?: string;
}

/**
 * Generates and triggers download of all 33 KPIs bulk CSV report.
 * Filename pattern: paperworking-portfolio-33-kpis-{period}-{YYYY-MM-DD}.csv
 */
export function exportBulkKpiCsv(payload: BulkKpiCsvPayload): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const pSlug = slugify(payload.projectSlug || payload.projectName || 'portfolio');
  const filename = `paperworking-${pSlug}-33-kpis-${payload.period}-${dateStr}.csv`;

  const rows: (string | number | null | undefined)[][] = [
    // Metadata Header Row
    [
      `# PaperWorking Bulk KPI Export - ${payload.projectName || 'Portfolio Aggregate'}`,
      `Active Projects: ${payload.projectCount}`,
      `Period: ${payload.period}`,
      `Total KPIs: ${payload.kpis.length}`,
      `ExportedAt: ${new Date().toISOString()}`,
    ],
    [],
    [
      'Category / Phase',
      'KPI #',
      'KPI Name',
      'Raw Value',
      'Formatted Value',
      'Unit',
      'Formula',
      'Input Sources',
    ],
  ];

  payload.kpis.forEach((k) => {
    rows.push([
      k.category || k.phase,
      k.number,
      k.name,
      k.rawValue,
      k.formattedValue,
      k.unit,
      k.formulaTemplate,
      k.inputsList,
    ]);
  });

  const csvString = buildCsvString(rows);
  triggerCsvDownload(csvString, filename);
  return filename;
}
