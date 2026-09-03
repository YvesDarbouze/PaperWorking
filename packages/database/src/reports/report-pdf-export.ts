import PDFDocument from 'pdfkit';

type GeneratedReportPayload = {
  type: string;
  executiveSummary: string;
  metrics: {
    scorecard: {
      noi: { value?: number | null };
      capRate: { value?: number | null };
      cashFlow: { value?: number | null };
      dscr: { value?: number | null };
      occupancyRate: { value?: number | null };
    };
  };
};

/** PdfKit adapter for demo report export — infrastructure layer. */
export function createReportPdfExportPort() {
  return {
    async exportPdf(report: GeneratedReportPayload): Promise<Buffer> {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
          const buffers: Buffer[] = [];

          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => resolve(Buffer.concat(buffers)));

          doc.fillColor('#0f172a').rect(0, 0, doc.page.width, 75).fill();
          doc
            .fillColor('#10b981')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('PAPERWORKING PORTFOLIO REPORT', 40, 20);
          doc
            .fillColor('#ffffff')
            .fontSize(11)
            .font('Helvetica')
            .text(`Executive Performance Report (${report.type.toUpperCase()})`, 40, 46);

          doc.moveDown(3);
          doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Executive Summary', 40, 100);
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#334155')
            .text(report.executiveSummary, 40, 120, { width: 500 });

          doc.moveDown(2);
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('Headline Scorecard Snapshot', 40, 170);

          const scorecard = report.metrics.scorecard;
          let y = 195;
          const rows = [
            ['NOI', `$${scorecard.noi.value?.toLocaleString() || '—'}`],
            ['Cap Rate', `${scorecard.capRate.value || '—'}%`],
            ['Cash Flow', `$${scorecard.cashFlow.value?.toLocaleString() || '—'}`],
            ['DSCR', `${scorecard.dscr.value || '—'}`],
            ['Occupancy Rate', `${scorecard.occupancyRate.value || '—'}%`],
          ];

          for (const [label, val] of rows) {
            doc.fontSize(10).font('Helvetica').fillColor('#334155').text(label, 40, y);
            doc.font('Helvetica-Bold').text(val, 250, y);
            y += 18;
          }

          doc.end();
        } catch (err) {
          reject(err);
        }
      });
    },
  };
}

export type ReportPdfExportAdapter = ReturnType<typeof createReportPdfExportPort>;
