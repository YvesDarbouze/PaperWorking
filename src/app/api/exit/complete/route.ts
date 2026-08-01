import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { trackEvent } from '@/actions/telemetry';
import PDFDocument from 'pdfkit';

import { z } from 'zod';

export const dynamic = 'force-dynamic';

const exitCompleteSchema = z.object({
  projectId: z.string().min(1, { message: "projectId is required" }),
  strategy: z.enum(['Sell', 'Refinance', 'Hold']).optional().default('Sell'),
});

// Programmatic CPA Tax Packet builder using pdfkit
async function generateCPATaxPacketPDF(
  address: string,
  strategy: string,
  purchasePrice: number,
  rehabCosts: number,
  holdingCosts: number,
  salePrice: number,
  loanPayoff: number,
  lpReturns: number,
  leadInvestorPromote: number,
  holdPeriodDays: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Cover Title
      doc.fontSize(14).font('Helvetica-Bold').text('CPA TAX PACKET & TERMINAL RECONCILIATION', { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(10).font('Helvetica-Bold').text('Report Date: ', { continued: true })
         .font('Helvetica').text(dateStr);
      doc.fontSize(10).font('Helvetica-Bold').text('Subject Property: ', { continued: true })
         .font('Helvetica').text(address);
      doc.fontSize(10).font('Helvetica-Bold').text('Exit Strategy: ', { continued: true })
         .font('Helvetica').text(strategy);
      doc.fontSize(10).font('Helvetica-Bold').text('Hold Period: ', { continued: true })
         .font('Helvetica').text(`${holdPeriodDays} Days`);
      doc.moveDown(2);

      // Section 1: Cost Basis Summary
      doc.fontSize(11).font('Helvetica-Bold').text('Section 1: Cost Basis Ledger Summary');
      doc.moveDown(0.5);
      
      const basisItems = [
        { label: 'Purchase Capitalized Price', amt: purchasePrice },
        { label: 'Renovations & CapEx costs', amt: rehabCosts },
        { label: 'Holding & Carrying charges', amt: holdingCosts },
        { label: 'Total Adjusted Cost Basis', amt: purchasePrice + rehabCosts + holdingCosts },
      ];

      basisItems.forEach((item) => {
        doc.fontSize(10).font(item.label.startsWith('Total') ? 'Helvetica-Bold' : 'Helvetica').text(`   ${item.label}: `, { continued: true })
           .text(`$${item.amt.toLocaleString()} USD`);
      });
      doc.moveDown(1.5);

      // Section 2: 1099-S Gross Proceeds
      doc.fontSize(11).font('Helvetica-Bold').text('Section 2: Form 1099-S Gross Proceeds');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').text(`   Gross Sales Proceeds (Contract Sale Price): $${salePrice.toLocaleString()} USD`);
      doc.fontSize(10).font('Helvetica').text(`   Lender Payoff / Senior Debt Discharged: $${loanPayoff.toLocaleString()} USD`);
      doc.moveDown(1.5);

      // Section 3: Capital Gains Classification
      doc.fontSize(11).font('Helvetica-Bold').text('Section 3: Capital Gains Estimates');
      doc.moveDown(0.5);
      
      const gainClassification = holdPeriodDays > 365 ? 'Long-Term Capital Gain (Hold > 1 year)' : 'Short-Term Capital Gain / Ordinary Income';
      const grossProfit = salePrice - purchasePrice - rehabCosts - holdingCosts;
      const netCapitalGain = grossProfit - (salePrice * 0.08); // simple estimation minus commissions

      doc.fontSize(10).font('Helvetica-Bold').text(`   Classification: `, { continued: true })
         .font('Helvetica').text(gainClassification);
      doc.fontSize(10).font('Helvetica-Bold').text(`   Net Estimated Taxable Gain: `, { continued: true })
         .font('Helvetica').text(`$${Math.round(netCapitalGain).toLocaleString()} USD`);
      doc.moveDown(1.5);

      // Section 4: Waterfall distributions
      doc.fontSize(11).font('Helvetica-Bold').text('Section 4: Distribution Waterfall Payouts');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`   Lender Share: $${loanPayoff.toLocaleString()} USD`);
      doc.fontSize(10).font('Helvetica').text(`   Limited Partner Return (Initial + Preferred): $${Math.round(lpReturns).toLocaleString()} USD`);
      doc.fontSize(10).font('Helvetica').text(`   General Partner Promote: $${Math.round(leadInvestorPromote).toLocaleString()} USD`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { uid } = auth;
    const body = await req.json().catch(() => ({}));
    const parseRes = exitCompleteSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json({ error: parseRes.error.issues[0].message }, { status: 400 });
    }
    const { projectId, strategy } = parseRes.data;

    // Get Firestore project document
    const projectRef = adminDb.collection('projects').doc(projectId);
    const docSnap = await projectRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = docSnap.data() || {};
    const f = projectData.financials || {};

    // Base variables
    const address = projectData.address || projectData.name || 'Subject Property';
    const purchasePrice = (f.purchasePrice || 22000000) / 100;
    const rehabCosts = (f.projectedRehabCost || 4500000) / 100;
    const holdingCosts = (f.annualDebtService || 1200000) / 100;
    const salePrice = f.exitListPrice || 320000;
    const loanPayoff = (f.loanAmount || 18000000) / 100;
    const cashInvested = (f.totalCashInvested || 8000000) / 100;

    // Waterfall math
    const grossProfit = salePrice - purchasePrice - rehabCosts - holdingCosts;
    const netProfit = grossProfit - (salePrice * 0.08); // commissions & closing
    const lpReturns = cashInvested * 1.08;
    const leadInvestorPromote = Math.max(0, (netProfit - (lpReturns - cashInvested)) * 0.2);

    const holdPeriodDays = 325; // default hold period for simulation

    // Update Firestore to exited/archived read-only state
    await projectRef.update({
      status: 'exited',
      phaseStatus: 'Phase 4: Exited',
      locked: true,
      updatedAt: new Date().toISOString(),
      'financials.exitRealized': true,
      'financials.exitStrategy': strategy,
      'financials.exitPrepComplete': true,
      'financials.exitExecComplete': true,
    });

    // Telemetry
    await trackEvent('project_exited' as any, {
      projectId,
      strategy,
      netProfit,
    });

    // Generate CPA Tax Packet Buffer
    const pdfBuffer = await generateCPATaxPacketPDF(
      address,
      strategy,
      purchasePrice,
      rehabCosts,
      holdingCosts,
      salePrice,
      loanPayoff,
      lpReturns,
      leadInvestorPromote,
      holdPeriodDays
    );

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TaxPacket_${projectId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('[exit-complete] Server failure:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
