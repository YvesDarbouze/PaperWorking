/**
 * Branded PDF export for Tax Intelligence reports.
 *
 * `pdfGenerator.ts` renders metric dashboards and has no branding, pagination,
 * or report context, so this is a separate exporter built on the jsPDF +
 * jspdf-autotable pair already in `package.json`.
 *
 * Every page carries, per requirement 6:
 *   - the PaperWorking wordmark
 *   - the report title
 *   - the generation date
 *   - the property / deal context the figures cover
 *   - "Page N of M"
 *
 * jsPDF is imported dynamically so it never lands in the initial client bundle
 * — the library is ~350kB and only needed when a user actually exports.
 */

import { assessReportReadiness, type ReportReadiness } from './plaidPhaseTagging';

export interface TaxReportPdfSection {
  /** Section heading, e.g. "Rental Income". Omit for an unlabelled table. */
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface TaxReportPdfOptions {
  /** Report title, e.g. "Profit & Loss Statement". */
  title: string;
  /** Property / deal context line, e.g. "4208 Melrose Ave · Q3 2026". */
  context: string;
  sections: TaxReportPdfSection[];
  /** Overrides the generation timestamp. Injected by tests for determinism. */
  generatedAt?: Date;
  /** Footer disclaimer. Defaults to the shared tax disclaimer. */
  disclaimer?: string;
  /** Suggested download filename, without the .pdf extension. */
  fileName?: string;
}

export const DEFAULT_TAX_DISCLAIMER =
  'Estimate worksheet — confirm with your CPA. Not tax advice.';

/** Page geometry, in points (jsPDF default unit for `format: "letter"`). */
const PAGE = { marginX: 40, headerY: 46, bodyTop: 96, footerOffset: 28 };

/** Deterministic filename: lower-kebab title + ISO date. */
export function buildPdfFileName(title: string, generatedAt: Date): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}

export function formatGeneratedAt(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * True when there is enough data to produce a meaningful export.
 * Re-exported so the UI can drive one disabled state + tooltip from one rule.
 */
export function canExportReport(
  projectCount: number,
  transactionCount: number,
): ReportReadiness {
  return assessReportReadiness(projectCount, transactionCount);
}

/** A section with no rows contributes nothing and is skipped. */
export function hasRenderableData(sections: TaxReportPdfSection[]): boolean {
  return sections.some((s) => s.rows.length > 0);
}

/**
 * Render and download the report.
 *
 * Throws when there is nothing to render — callers should have disabled the
 * action via `canExportReport` first, so reaching here with no data is a bug
 * rather than a user-facing state.
 */
export async function exportTaxReportPdf(options: TaxReportPdfOptions): Promise<void> {
  const {
    title,
    context,
    sections,
    generatedAt = new Date(),
    disclaimer = DEFAULT_TAX_DISCLAIMER,
    fileName,
  } = options;

  if (!hasRenderableData(sections)) {
    throw new Error('Add more transactions to generate this report.');
  }

  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedLabel = `Generated ${formatGeneratedAt(generatedAt)}`;

  let cursorY = PAGE.bodyTop;

  for (const section of sections) {
    if (section.rows.length === 0) continue;

    if (section.heading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30);
      doc.text(section.heading, PAGE.marginX, cursorY);
      cursorY += 14;
    }

    autoTable(doc, {
      head: [section.columns],
      body: section.rows.map((r) => r.map((c) => String(c))),
      startY: cursorY,
      margin: { left: PAGE.marginX, right: PAGE.marginX, top: PAGE.bodyTop },
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 247, 249] },
      theme: 'grid',
    });

    // `lastAutoTable` is attached by the plugin; typed loosely on purpose.
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    cursorY = (lastY ?? cursorY) + 26;
  }

  // Header and footer are stamped after the body so the total page count is known.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    // ── Brand + title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17);
    doc.text('PaperWorking', PAGE.marginX, PAGE.headerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(title, PAGE.marginX, PAGE.headerY + 17);

    // ── Context + generation date, right-aligned ──
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(context, pageWidth - PAGE.marginX, PAGE.headerY, { align: 'right' });
    doc.text(generatedLabel, pageWidth - PAGE.marginX, PAGE.headerY + 12, { align: 'right' });

    doc.setDrawColor(220);
    doc.line(PAGE.marginX, PAGE.headerY + 26, pageWidth - PAGE.marginX, PAGE.headerY + 26);

    // ── Footer ──
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(disclaimer, PAGE.marginX, pageHeight - PAGE.footerOffset);
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - PAGE.marginX,
      pageHeight - PAGE.footerOffset,
      { align: 'right' },
    );
  }

  doc.save(fileName ? `${fileName}.pdf` : buildPdfFileName(title, generatedAt));
}
