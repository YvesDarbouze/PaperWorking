import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import {
  computeClosingCostLines,
  totalClosingCosts,
  type ClosingCostOverrides,
  type ClosingCostInputs,
  type ClosingCostLine,
} from '@/lib/math/closingCosts';
import { jsPDF } from 'jspdf';
import { telemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const BRAND_DARK  = [18, 16, 20] as [number, number, number];
const BRAND_WHITE = [253, 255, 252] as [number, number, number];
const MID_GRAY    = [127, 127, 127] as [number, number, number];
const LIGHT_GRAY  = [220, 220, 220] as [number, number, number];

function fmtDollar(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(lines: ClosingCostLine[], total: number, address: string, date: string): string {
  const rows: string[] = [
    `"Closing Ledger — ${address}"`,
    `"Generated","${date}"`,
    '',
    '"Line Item","Type","Computed ($)","Override ($)","Amount ($)"',
  ];

  for (const l of lines) {
    rows.push(
      [
        csvEscape(l.label),
        csvEscape(l.isOverridden ? 'Overridden' : 'Computed'),
        csvEscape(l.computed.toFixed(2)),
        csvEscape(l.isOverridden && l.override !== undefined ? l.override.toFixed(2) : ''),
        csvEscape(l.amount.toFixed(2)),
      ].join(','),
    );
  }

  rows.push('', `"","","","TOTAL",${csvEscape(total.toFixed(2))}`);
  return rows.join('\r\n');
}

function buildPdf(lines: ClosingCostLine[], total: number, address: string, date: string): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  const cw = 210 - margin * 2;
  let y = 38;

  // Header banner
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_WHITE);
  doc.text('PAPERWORKING', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('CLOSING LEDGER EXPORT', margin, 17);

  // Footer
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, 275, 210 - margin, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Generated ${date} · PaperWorking Closing Ledger · Read-only snapshot`, margin, 279);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(18, 16, 20);
  doc.text('Closing Cost Ledger', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_GRAY);
  doc.text(address, margin, y);
  y += 10;

  // Column headers
  const colX = [margin, margin + 70, margin + 110, margin + 145];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Line Item', colX[0], y);
  doc.text('Type', colX[1], y);
  doc.text('Computed', colX[2], y, { align: 'right' });
  doc.text('Amount', 210 - margin, y, { align: 'right' });
  y += 2;

  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, y, 210 - margin, y);
  y += 4;

  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (const l of lines) {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    const rowColor = l.isOverridden ? ([90, 60, 10] as [number, number, number]) : ([40, 40, 40] as [number, number, number]);
    doc.setTextColor(...rowColor);
    doc.text(l.label, colX[0], y);

    doc.setTextColor(...MID_GRAY);
    doc.text(l.isOverridden ? 'Override' : 'Computed', colX[1], y);

    doc.setTextColor(60, 60, 60);
    doc.text(fmtDollar(l.computed), colX[2], y, { align: 'right' });

    doc.setFont('helvetica', l.isOverridden ? 'bold' : 'normal');
    doc.setTextColor(l.isOverridden ? 200 : 30, l.isOverridden ? 120 : 30, l.isOverridden ? 20 : 30);
    doc.text(fmtDollar(l.amount), 210 - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // basis hint
    y += 4;
    doc.setFontSize(6);
    doc.setTextColor(...LIGHT_GRAY);
    const basisStr = l.basis.length > 70 ? l.basis.slice(0, 67) + '…' : l.basis;
    doc.text(basisStr, colX[0], y);
    doc.setFontSize(8);
    y += 5;
  }

  // Total row
  y += 2;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, y, 210 - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 16, 20);
  doc.text('Total Closing Costs', colX[0], y);
  doc.text(fmtDollar(total), 210 - margin, y, { align: 'right' });

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

export async function GET(req: NextRequest, { params }: Params) {
  // 1. Auth
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  // 2. Resolve project from Firestore
  const { id } = await params;
  const projectSnap = await adminDb.collection('projects').doc(id).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  const projectData = projectSnap.data()!;

  // 3. Membership check — no writes; read-only snapshot
  const isOwner  = projectData.ownerUid === uid;
  const isMember = !!projectData.members?.[uid];
  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'Access denied: not a project member' }, { status: 403 });
  }

  // 3.5 Telemetry
  try {
    const format = new URL(req.url).searchParams.get('format') === 'pdf' ? 'pdf' : 'csv';
    await telemetry.capture({
      distinctId: uid,
      event: 'closing_ledger_exported',
      properties: {
        projectId: id,
        format,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (telemetryErr) {
    console.error('[Export Ledger] Telemetry failed:', telemetryErr);
  }

  // 4. Extract financials — no recomputation, just render what's persisted
  const f: ClosingCostInputs = projectData.financials ?? {};
  const overrides: ClosingCostOverrides = (projectData.financials?.closingCostOverrides as ClosingCostOverrides | undefined) ?? {};
  const lines = computeClosingCostLines(f, overrides);
  const total = totalClosingCosts(lines);

  // 5. Filename helpers
  const address = (projectData.address as string | undefined ?? id)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  const dateStr = new Date().toISOString().split('T')[0];
  const basename = `closing-ledger-${address}-${dateStr}`;

  // 6. Format
  const format = new URL(req.url).searchParams.get('format') === 'pdf' ? 'pdf' : 'csv';
  const displayAddress = (projectData.address as string | undefined) ?? id;

  if (format === 'csv') {
    const csv = buildCsv(lines, total, displayAddress, dateStr);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${basename}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // PDF
  const pdfBytes = buildPdf(lines, total, displayAddress, dateStr);
  return new NextResponse(pdfBytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${basename}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
