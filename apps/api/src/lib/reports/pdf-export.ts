import PDFDocument from 'pdfkit';
import type { GeneratedReport } from './report-builder.js';

export async function exportReportPdf(report: GeneratedReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header Banner
      doc.fillColor('#0f172a').rect(0, 0, doc.page.width, 70).fill();
      doc.fillColor('#10b981').fontSize(18).font('Helvetica-Bold').text('PAPERWORKING PORTFOLIO REPORT', 40, 18);

      const isDemo =
        Boolean(report.isDemo) ||
        String(report.metrics?.projectId || '').includes('demo') ||
        String(report.executiveSummary || '').includes('proj_demo');

      const subtitle = isDemo
        ? `Executive Performance Report (${report.type.toUpperCase()}) · ILLUSTRATIVE DEMO DATA`
        : `Executive Performance Report (${report.type.toUpperCase()})`;

      doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text(subtitle, 40, 42);

      if (isDemo) {
        doc
          .fillColor('#f59e0b')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('ILLUSTRATIVE DEMO DATA', doc.page.width - 200, 22, {
            align: 'right',
            width: 160,
          });
      }

      // Executive Summary
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Executive Summary', 40, 85);
      const summaryText = isDemo
        ? `${report.executiveSummary} (ILLUSTRATIVE DEMO DATA: Sample underwriting assumptions).`
        : report.executiveSummary;
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(summaryText, 40, 102, { width: 520 });

      // Key Scorecard Table
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Headline Scorecard Snapshot', 40, 138);

      const scorecard = report.metrics?.scorecard;
      const derived = report.metrics?.derived;
      let y = 158;
      if (scorecard) {
        const rows: Array<[string, string]> = [
          ['Net Operating Income (NOI)', `$${scorecard.noi?.value?.toLocaleString() || '—'}`],
          ['Market Cap Rate', `${scorecard.capRate?.value || '—'}%`],
          ['Net Cash Flow', `$${scorecard.cashFlow?.value?.toLocaleString() || '—'}`],
          ['DSCR', `${scorecard.dscr?.value || '—'}`],
          ['Occupancy Rate', `${scorecard.occupancyRate?.value || '—'}%`],
        ];

        if (derived?.capRateOnCost !== undefined && derived?.capRateOnCost !== null) {
          rows.push(['Cap Rate on Cost', `${derived.capRateOnCost}%`]);
        }

        if (derived?.exitValuation) {
          const exitLabel = derived.terminalValueLabel ? `(${derived.terminalValueLabel})` : '';
          rows.push(['Projected Exit Value', `$${derived.exitValuation.toLocaleString()} ${exitLabel}`]);
        }

        if (derived?.isNegativeLeverage) {
          const constPct = derived.loanConstantPct ? derived.loanConstantPct.toFixed(2) : '7.59';
          const yocPct = derived.yieldOnCostPct ?? derived.capRateOnCost ?? '6.4';
          rows.push(['Leverage Profile', `NEGATIVE LEVERAGE (${constPct}% constant > ${yocPct}% YoC)`]);
        }

        rows.forEach(([label, val]) => {
          doc.fontSize(9).font('Helvetica').fillColor('#334155').text(label, 40, y);
          doc.font('Helvetica-Bold').text(val, 240, y);
          y += 15;
        });
      }

      // W2-12: Server-Computed Sensitivity Matrix (IRR & CoC)
      const grids = (report.metrics as any)?.sensitivityGrids;
      if (grids?.rentVsExitValue) {
        y += 12;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Sensitivity Analysis: 5x5 IRR Matrix (Rent vs Exit Valuation)', 40, y);
        y += 16;
        doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('Exact server computation per cell — center cell (Base Case) highlighted with green boundary.', 40, y);
        y += 14;

        const grid = grids.rentVsExitValue;
        const colWidth = 72;
        const startX = 40;
        const headerY = y;

        // Header row
        doc.rect(startX, headerY, colWidth * 6, 18).fillColor('#f1f5f9').fill();
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text('Rent \\ Exit', startX + 6, headerY + 5);

        grid.colSteps.forEach((colStep: number, cIdx: number) => {
          const colLabel = colStep === 0 ? 'Base' : `${colStep > 0 ? '+' : ''}${colStep}%`;
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(colLabel, startX + (cIdx + 1) * colWidth + 14, headerY + 5);
        });

        y += 18;

        // Grid Rows
        grid.cells.forEach((row: any[], rIdx: number) => {
          const rowStep = grid.rowSteps[rIdx];
          const rowLabel = rowStep === 0 ? 'Base' : `${rowStep > 0 ? '+' : ''}${rowStep}%`;
          const rowY = y;

          // Row label cell
          doc.rect(startX, rowY, colWidth, 18).fillColor(rIdx % 2 === 0 ? '#ffffff' : '#f8fafc').fill();
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a').text(rowLabel, startX + 6, rowY + 5);

          row.forEach((cell: any, cIdx: number) => {
            const cellX = startX + (cIdx + 1) * colWidth;
            const isBase = cell.isBaseCase;

            // Background
            doc.rect(cellX, rowY, colWidth, 18).fillColor(isBase ? '#ecfdf5' : rIdx % 2 === 0 ? '#ffffff' : '#f8fafc').fill();

            // Border highlight for base case
            if (isBase) {
              doc.rect(cellX, rowY, colWidth, 18).lineWidth(1.5).strokeColor('#10b981').stroke();
            } else {
              doc.rect(cellX, rowY, colWidth, 18).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
            }

            // Cell Value text
            const irrText = cell.irrPct !== null
              ? `${cell.irrPct.toFixed(1)}%`
              : cell.irrStatus === 'no_sign_change'
                ? 'No Sign'
                : '—';

            doc
              .fontSize(8)
              .font(isBase ? 'Helvetica-Bold' : 'Helvetica')
              .fillColor(isBase ? '#047857' : '#1e293b')
              .text(irrText, cellX, rowY + 5, { width: colWidth, align: 'center' });
          });

          y += 18;
        });
      }

      // Statutory Financial & Legal Disclaimer Footer (Review C3.4)
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      doc.rect(40, pageHeight - 45, pageWidth - 80, 0.5).fillColor('#cbd5e1').fill();
      doc
        .fontSize(7.5)
        .font('Helvetica-Oblique')
        .fillColor('#64748b')
        .text(
          'Hypothetical illustration based on user-supplied assumptions; not investment, legal, tax, or financial advice; not a prediction or guarantee.',
          40,
          pageHeight - 38,
          { width: pageWidth - 80, align: 'center' },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
