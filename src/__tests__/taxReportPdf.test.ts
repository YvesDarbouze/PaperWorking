import {
  DEFAULT_TAX_DISCLAIMER,
  buildPdfFileName,
  canExportReport,
  exportTaxReportPdf,
  formatGeneratedAt,
  hasRenderableData,
  type TaxReportPdfSection,
} from '@/lib/reports/taxReportPdf';

/* ── jsPDF + autotable are stubbed: this asserts what we ASK the library to
      draw (branding, context, page numbers), not the library's own rendering. */

const save = jest.fn();
const text = jest.fn();
const setPage = jest.fn();
const getNumberOfPages = jest.fn(() => 2);
const autoTableSpy = jest.fn();

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 612, getHeight: () => 792 } },
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    text,
    setPage,
    getNumberOfPages,
    save,
    lastAutoTable: { finalY: 300 },
  })),
}));

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: (...args: unknown[]) => autoTableSpy(...args),
}));

const section = (rows: (string | number)[][]): TaxReportPdfSection => ({
  heading: 'Rental Income',
  columns: ['Line', 'Amount'],
  rows,
});

describe('taxReportPdf', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('pure helpers', () => {
    it('builds a deterministic kebab-case filename with an ISO date', () => {
      const name = buildPdfFileName('Profit & Loss Statement', new Date('2026-08-05T12:00:00Z'));
      expect(name).toBe('profit-loss-statement-2026-08-05.pdf');
    });

    it('does not leave leading or trailing dashes', () => {
      expect(buildPdfFileName('— Schedule E —', new Date('2026-01-02T00:00:00Z')))
        .toBe('schedule-e-2026-01-02.pdf');
    });

    it('formats the generation date in long form', () => {
      expect(formatGeneratedAt(new Date('2026-08-05T12:00:00Z'))).toMatch(/August\s+5,\s+2026/);
    });

    it('detects renderable data', () => {
      expect(hasRenderableData([section([])])).toBe(false);
      expect(hasRenderableData([section([['Rent', '$1,000']])])).toBe(true);
      expect(hasRenderableData([])).toBe(false);
    });

    it('re-exports the readiness rule so UI and export agree', () => {
      expect(canExportReport(0, 50).ready).toBe(false);
      expect(canExportReport(1, 0).reason).toBe('Add more transactions to generate this report.');
      expect(canExportReport(1, 3).ready).toBe(true);
    });
  });

  describe('exportTaxReportPdf', () => {
    const base = {
      title: 'Profit & Loss Statement',
      context: '4208 Melrose Ave · Q3 2026',
      generatedAt: new Date('2026-08-05T12:00:00Z'),
    };

    it('refuses to render when every section is empty', async () => {
      await expect(
        exportTaxReportPdf({ ...base, sections: [section([])] }),
      ).rejects.toThrow('Add more transactions to generate this report.');
      expect(save).not.toHaveBeenCalled();
    });

    it('stamps brand, title, context and generation date on every page', async () => {
      await exportTaxReportPdf({ ...base, sections: [section([['Rent', '$1,000']])] });

      const drawn = text.mock.calls.map((c) => String(c[0]));
      expect(drawn).toContain('PaperWorking');
      expect(drawn).toContain('Profit & Loss Statement');
      expect(drawn).toContain('4208 Melrose Ave · Q3 2026');
      expect(drawn.some((d) => /Generated August\s+5,\s+2026/.test(d))).toBe(true);
    });

    it('numbers every page as "Page N of M"', async () => {
      await exportTaxReportPdf({ ...base, sections: [section([['Rent', '$1,000']])] });

      const drawn = text.mock.calls.map((c) => String(c[0]));
      expect(drawn).toContain('Page 1 of 2');
      expect(drawn).toContain('Page 2 of 2');
      // Header/footer are stamped per page after the body is laid out.
      expect(setPage).toHaveBeenCalledWith(1);
      expect(setPage).toHaveBeenCalledWith(2);
    });

    it('includes the tax disclaimer by default and allows an override', async () => {
      await exportTaxReportPdf({ ...base, sections: [section([['Rent', '$1,000']])] });
      expect(text.mock.calls.map((c) => String(c[0]))).toContain(DEFAULT_TAX_DISCLAIMER);

      jest.clearAllMocks();
      await exportTaxReportPdf({
        ...base,
        sections: [section([['Rent', '$1,000']])],
        disclaimer: 'Internal draft',
      });
      expect(text.mock.calls.map((c) => String(c[0]))).toContain('Internal draft');
    });

    it('skips empty sections but still renders populated ones', async () => {
      await exportTaxReportPdf({
        ...base,
        sections: [section([]), section([['Rent', '$1,000']])],
      });
      expect(autoTableSpy).toHaveBeenCalledTimes(1);
    });

    it('coerces cell values to strings for the table body', async () => {
      await exportTaxReportPdf({ ...base, sections: [section([['Units', 4]])] });
      const cfg = autoTableSpy.mock.calls[0][1] as { body: string[][] };
      expect(cfg.body).toEqual([['Units', '4']]);
    });

    it('saves with the derived filename, or an explicit override', async () => {
      await exportTaxReportPdf({ ...base, sections: [section([['Rent', '$1,000']])] });
      expect(save).toHaveBeenCalledWith('profit-loss-statement-2026-08-05.pdf');

      jest.clearAllMocks();
      await exportTaxReportPdf({
        ...base,
        sections: [section([['Rent', '$1,000']])],
        fileName: 'custom-name',
      });
      expect(save).toHaveBeenCalledWith('custom-name.pdf');
    });
  });
});
