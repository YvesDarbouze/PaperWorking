import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';
import { generatePDF, generateHTML } from '@/lib/accounting/reconciliationReport';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reconciliations/[periodId]/report?format=json|html|pdf
 *
 * format=json  — Structured report data (default)
 * format=html  — Print-friendly HTML with full 5-section layout
 * format=pdf   — CPA-ready PDF document (Buffer → application/pdf)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  try {
    const { periodId } = await params;
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(periodId);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reconciliation-${periodId}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'html') {
      const html = await generateHTML(periodId);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default: JSON — uses existing engine method for lightweight structured data
    const report = await BankReconciliationEngine.generateReconciliationReport(periodId);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    const isNotFound = error.message?.includes('not found');
    console.error('[GET /api/reconciliations/[periodId]/report] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
