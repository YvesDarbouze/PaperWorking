import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { jsPDF } from 'jspdf';
import { telemetry } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const BRAND_DARK   = [18, 16, 20] as [number, number, number];
const BRAND_WHITE  = [253, 255, 252] as [number, number, number];
const MID_GRAY     = [127, 127, 127] as [number, number, number];
const LIGHT_GRAY   = [220, 220, 220] as [number, number, number];
const ACCENT_BLUE  = [122, 158, 170] as [number, number, number];

function fmtDollar(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildPdf(
  projectData: any,
  commitments: any[],
  address: string,
  date: string
): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  let y = 38;

  // Header banner
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, 210, 28, 'F');

  const fs = require('fs');
  const path = require('path');
  let logoBase64 = '';
  try {
    const logoPath = path.join(process.cwd(), 'public/brand/PaperWorking_White_full_Logo_.png');
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  } catch {}

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 7, 24.3, 4);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_WHITE);
    doc.text('PAPERWORKING', margin, 11);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GRAY);
  doc.text('CAPITAL STACK STATEMENT', margin, 17);

  // Footer
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, 275, 210 - margin, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...MID_GRAY);
  doc.text(`Generated ${date} · PaperWorking Capital Stack Ledger · Verified Statement`, margin, 279);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(18, 16, 20);
  doc.text('Capital Stack Statement', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_GRAY);
  doc.text(address, margin, y);
  y += 12;

  // Summary figures
  const financials = projectData.financials ?? {};
  const capitalStack = financials.capitalStack ?? [];
  const raiseTarget = financials.capitalRaiseTarget ?? 0;

  // Sum confirmed contributions
  const confirmedInvestorEquity = commitments
    .filter((c: any) => (c.status === 'funds-confirmed' || c.status === 'cleared') && c.partyType === 'Investor')
    .reduce((sum: number, c: any) => sum + ((c.amountCents || 0) / 100), 0);

  const confirmedLeadInvestorEquity = commitments
    .filter((c: any) => (c.status === 'funds-confirmed' || c.status === 'cleared') && (c.partyType === 'LeadInvestor' || c.partyType === 'Co-GP'))
    .reduce((sum: number, c: any) => sum + ((c.amountCents || 0) / 100), 0);

  const updatedCapitalStack = capitalStack.map((s: any) => {
    if (s.category === 'Co-buying Equity') {
      return { ...s, amount: confirmedInvestorEquity, status: 'Funded' };
    }
    if (s.category === 'Syndication Equity') {
      return { ...s, amount: confirmedInvestorEquity, status: 'Funded' };
    }
    if (s.category === 'GP Co-investment') {
      return { ...s, amount: confirmedLeadInvestorEquity, status: 'Funded' };
    }
    return s;
  });

  // Rollups
  const totalDebt = updatedCapitalStack.reduce((sum: number, src: any) => sum + (src.amount ?? 0), 0);
  const totalCommitted = commitments.reduce((sum: number, c: any) => sum + ((c.amountCents ?? 0) / 100), 0);
  const totalConfirmed = commitments.reduce((sum: number, c: any) => {
    const isFunded = c.status === 'funds-confirmed' || c.status === 'cleared';
    return sum + (isFunded ? ((c.amountCents ?? 0) / 100) : 0);
  }, 0);

  // Summary box
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, y, 210 - margin * 2, 22, 'F');
  doc.setDrawColor(...LIGHT_GRAY);
  doc.rect(margin, y, 210 - margin * 2, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL DEBT', margin + 8, y + 6);
  doc.text('TOTAL EQUITY TARGET', margin + 55, y + 6);
  doc.text('CONFIRMED / FUNDED', margin + 110, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(18, 16, 20);
  doc.text(fmtDollar(totalDebt), margin + 8, y + 14);
  doc.text(fmtDollar(raiseTarget), margin + 55, y + 14);
  doc.setTextColor(...ACCENT_BLUE);
  doc.text(fmtDollar(totalConfirmed), margin + 110, y + 14);
  y += 30;

  // 1. Debt Stack Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 16, 20);
  doc.text('1. Debt Tranches', margin, y);
  y += 6;

  const colX = [margin, margin + 50, margin + 95, margin + 125];
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Lender / Source', colX[0], y);
  doc.text('Category', colX[1], y);
  doc.text('Interest Rate', colX[2], y, { align: 'right' });
  doc.text('Amount', 210 - margin, y, { align: 'right' });
  y += 2;

  doc.line(margin, y, 210 - margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  if (updatedCapitalStack.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MID_GRAY);
    doc.text('No active debt sources configured.', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    y += 6;
  } else {
    for (const src of updatedCapitalStack) {
      doc.text(src.lenderName || 'Unnamed Lender', colX[0], y);
      doc.text(src.category || 'Debt', colX[1], y);
      doc.text(src.interestRate ? `${src.interestRate}%` : '--', colX[2], y, { align: 'right' });
      doc.text(fmtDollar(src.amount ?? 0), 210 - margin, y, { align: 'right' });
      y += 6;
    }
  }
  y += 6;

  // 2. Equity Ledger Table
  if (y > 200) {
    doc.addPage();
    y = 25;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 16, 20);
  doc.text('2. Contribution Ledger (Equity Stack)', margin, y);
  y += 6;

  const eColX = [margin, margin + 45, margin + 70, margin + 105, margin + 135];
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Party', eColX[0], y);
  doc.text('Role', eColX[1], y);
  doc.text('Status', eColX[2], y);
  doc.text('Committed', eColX[3], y, { align: 'right' });
  doc.text('Confirmed', eColX[4], y, { align: 'right' });
  doc.text('Equity %', 210 - margin, y, { align: 'right' });
  y += 2;

  doc.line(margin, y, 210 - margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  if (commitments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...MID_GRAY);
    doc.text('No active equity contributions recorded.', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    y += 6;
  } else {
    for (const c of commitments) {
      if (y > 260) {
        doc.addPage();
        y = 25;
      }
      const isFunded = c.status === 'funds-confirmed' || c.status === 'cleared';
      const commAmount = (c.amountCents ?? 0) / 100;
      const confAmount = isFunded ? commAmount : 0;
      const eqPct = raiseTarget > 0 ? (commAmount / raiseTarget) * 100 : 0;

      // Name & Email
      doc.setFont('helvetica', 'bold');
      doc.text(c.name, eColX[0], y);
      doc.setFont('helvetica', 'normal');
      
      // Role & Status
      doc.text(c.partyType || 'Investor', eColX[1], y);
      doc.text(c.status, eColX[2], y);

      // Amounts
      doc.text(fmtDollar(commAmount), eColX[3], y, { align: 'right' });
      doc.setTextColor(isFunded ? 40 : 120, isFunded ? 120 : 120, isFunded ? 40 : 120);
      doc.text(fmtDollar(confAmount), eColX[4], y, { align: 'right' });
      doc.setTextColor(50, 50, 50);

      // Equity Percentage
      doc.text(`${eqPct.toFixed(2)}%`, 210 - margin, y, { align: 'right' });

      // Evidence string if exists
      if (c.transitions && c.transitions.length > 0) {
        const lastTransition = c.transitions[c.transitions.length - 1];
        if (lastTransition.evidence) {
          y += 4;
          doc.setFontSize(6.5);
          doc.setTextColor(...MID_GRAY);
          doc.text(`Evidence: ${lastTransition.evidence}`, eColX[0], y);
          doc.setFontSize(8.5);
          doc.setTextColor(50, 50, 50);
        }
      }

      y += 6;
    }
  }

  // Totals line
  y += 2;
  doc.line(margin, y, 210 - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(18, 16, 20);
  doc.text('Total Raised', eColX[0], y);
  doc.text(fmtDollar(totalCommitted), eColX[3], y, { align: 'right' });
  doc.text(fmtDollar(totalConfirmed), eColX[4], y, { align: 'right' });

  const totalEq = raiseTarget > 0 ? (totalCommitted / raiseTarget) * 100 : 0;
  doc.text(`${totalEq.toFixed(2)}%`, 210 - margin, y, { align: 'right' });

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    // 1. Authenticate user
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

    // 3. Verify membership
    const isOwner  = projectData.ownerUid === uid;
    const isMember = !!projectData.members?.[uid];
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 3.5 Emit telemetry event
    try {
      await telemetry.capture({
        distinctId: uid,
        event: 'capital_stack_exported',
        properties: {
          projectId: id,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (telemetryErr) {
      console.error('[Export Stack] Telemetry failed:', telemetryErr);
    }

    // 4. Fetch all commitments (contributions ledger)
    const commSnap = await adminDb
      .collection('projects')
      .doc(id)
      .collection('commitments')
      .orderBy('createdAt', 'asc')
      .get();
    
    const commitments = commSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 5. Filename & date
    const address = (projectData.address as string | undefined ?? id)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `capital-stack-statement-${address}-${dateStr}.pdf`;

    const displayAddress = (projectData.address as string | undefined) ?? id;

    // 6. Generate PDF bytes
    const pdfBytes = buildPdf(projectData, commitments, displayAddress, dateStr);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[Capital Stack Export] Failed:', err.message);
    return NextResponse.json({ error: 'Failed to export capital stack' }, { status: 500 });
  }
}
