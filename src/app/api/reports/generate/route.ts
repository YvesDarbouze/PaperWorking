import { NextResponse } from 'next/server';
import { buildPortfolioReport } from '@/lib/reports/report-builder';
import { exportReportPdf } from '@/lib/reports/pdf-export';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || 'quarterly';
    const format = body.format || 'pdf';

    const report = await buildPortfolioReport(type, format);

    if (format === 'csv') {
      return new NextResponse(report.csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="PaperWorking_Report_${type}_${Date.now()}.csv"`,
        },
      });
    }

    const pdfBuffer = await exportReportPdf(report);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PaperWorking_Report_${type}_${Date.now()}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
