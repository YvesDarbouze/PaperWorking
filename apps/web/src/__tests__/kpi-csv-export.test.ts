import {
  escapeCsvCell,
  buildCsvString,
  slugify,
  exportSingleKpiCsv,
  exportBulkKpiCsv,
  type SingleKpiCsvPayload,
  type BulkKpiCsvPayload,
} from '@/lib/export/kpi-csv';

describe('KPI CSV Generation & Export Engine', () => {
  describe('escapeCsvCell', () => {
    test('handles null and undefined gracefully as empty strings', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    test('returns plain strings unmodified if no special characters exist', () => {
      expect(escapeCsvCell('Debt Yield')).toBe('Debt Yield');
      expect(escapeCsvCell(123.45)).toBe('123.45');
    });

    test('quotes strings containing commas per RFC-4180', () => {
      expect(escapeCsvCell('$182,400')).toBe('"$182,400"');
    });

    test('escapes internal double quotes by doubling them and wrapping in quotes', () => {
      expect(escapeCsvCell('DSCR "Target" Hurdle')).toBe('"DSCR ""Target"" Hurdle"');
    });

    test('quotes strings containing newlines', () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });
  });

  describe('buildCsvString', () => {
    test('prepends UTF-8 BOM \\uFEFF for seamless Excel compatibility', () => {
      const csv = buildCsvString([['Header 1', 'Header 2']]);
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    test('joins rows with CRLF per RFC-4180 standard', () => {
      const csv = buildCsvString([
        ['A', 'B'],
        ['C', 'D'],
      ]);
      expect(csv).toBe('\uFEFFA,B\r\nC,D');
    });
  });

  describe('slugify', () => {
    test('creates safe url/file slugs', () => {
      expect(slugify('Highland Park Lofts')).toBe('highland-park-lofts');
      expect(slugify('Debt Yield (NOI/Loan)')).toBe('debt-yield-noi-loan');
      expect(slugify('  Trim Spaces  ')).toBe('trim-spaces');
    });
  });

  describe('exportSingleKpiCsv', () => {
    test('generates expected filename and includes period in metadata', () => {
      const payload: SingleKpiCsvPayload = {
        kpi: {
          number: 15,
          name: 'Debt Service Coverage (DSCR)',
          id: 'dscr',
          phase: 'Phase 2: Full Underwriting & Return Modeling',
          unit: 'ratio',
          definition: 'Coverage multiple measuring operational Net Operating Income against debt.',
          formulaTemplate: 'NOI ÷ Debt Service',
          inputs: [{ name: 'NOI', source: 'Financial Engine' }],
        },
        rawValue: 1.23,
        formattedValue: '1.23×',
        substitutedFormula: 'DSCR = NOI $182,400 ÷ Debt Service $148,200 = 1.23×',
        inputsProvenance: [
          { name: 'NOI', source: 'Engine', value: '$182,400', isAvailable: true },
          { name: 'Debt Service', source: 'Loan Input', value: '$148,200', isAvailable: true },
        ],
        period: 'quarterly',
        projectName: 'Highland Park Lofts',
        projectSlug: 'highland-park',
      };

      const filename = exportSingleKpiCsv(payload);
      const dateToday = new Date().toISOString().split('T')[0];
      expect(filename).toBe(`paperworking-highland-park-dscr-${dateToday}.csv`);
    });
  });

  describe('exportBulkKpiCsv', () => {
    test('generates bulk CSV filename with period snapshot', () => {
      const payload: BulkKpiCsvPayload = {
        period: 'annual',
        projectCount: 3,
        projectName: 'Portfolio Aggregate',
        projectSlug: 'portfolio',
        kpis: [
          {
            number: 1,
            name: 'Gross Purchase Price',
            id: 'gross_purchase_price',
            phase: 'Phase 1: Deal Intake & Quick Screen',
            unit: 'currency',
            rawValue: 400000,
            formattedValue: '$400,000',
            formulaTemplate: 'Contract Price',
            inputsList: 'Purchase Price',
          },
        ],
      };

      const filename = exportBulkKpiCsv(payload);
      const dateToday = new Date().toISOString().split('T')[0];
      expect(filename).toBe(`paperworking-portfolio-33-kpis-annual-${dateToday}.csv`);
    });
  });
});
