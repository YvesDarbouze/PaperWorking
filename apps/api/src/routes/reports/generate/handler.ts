import type { RouteResult } from '../../../http/response.js';
import { jsonResponse } from '../../../http/response.js';
import { buildPortfolioReport } from '../../../lib/reports/report-builder.js';
import { exportReportPdf } from '../../../lib/reports/pdf-export.js';

export interface ReportsGenerateBody {
  type?: 'monthly' | 'quarterly' | 'yearly' | 'overall';
  format?: 'pdf' | 'csv';
}

export interface ReportsGenerateDeps {
  buildReport?: typeof buildPortfolioReport;
  exportPdf?: typeof exportReportPdf;
}

/**
 * POST /api/reports/generate — migrated from PaperWorking src/app/api/reports/generate/route.ts
 */
export async function handleReportsGeneratePost(
  body: ReportsGenerateBody = {},
  deps: ReportsGenerateDeps = {},
): Promise<RouteResult> {
  try {
    const type = body.type ?? 'quarterly';
    const format = body.format ?? 'pdf';
    const build = deps.buildReport ?? buildPortfolioReport;
    const exportPdf = deps.exportPdf ?? exportReportPdf;

    const report = await build(type, format);

    if (format === 'csv') {
      return {
        status: 200,
        body: report.csvContent ?? '',
        headers: {
          'content-type': 'text/csv',
          'Content-Disposition': `attachment; filename="PaperWorking_Report_${type}_${Date.now()}.csv"`,
        },
      };
    }

    const pdfBuffer = await exportPdf(report);
    return {
      status: 200,
      body: pdfBuffer,
      headers: {
        'content-type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PaperWorking_Report_${type}_${Date.now()}.pdf"`,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { success: false, error: message });
  }
}
