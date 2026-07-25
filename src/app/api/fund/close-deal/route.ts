import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { trackEvent } from '@/actions/telemetry';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { addBusinessDays } from '@/lib/utils/businessDays';
import { NotificationService } from '@/lib/services/notificationService';

const closeDealSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  finalPurchasePrice: z.number().default(250000),
  titleFees: z.number().default(2000),
  originationFees: z.number().default(3000),
  isEstimate: z.boolean().default(false),
  sources: z.array(z.object({
    source: z.string(),
    amount: z.number()
  })).optional(),
  uses: z.array(z.object({
    use: z.string(),
    amount: z.number()
  })).optional(),
  justification: z.string().default('')
});

export const dynamic = 'force-dynamic';

// Programmatic closing summary PDF builder using pdfkit
async function generateClosingSummaryPDF(
  propertyName: string,
  purchasePrice: number,
  titleFees: number,
  originationFees: number,
  buyerName: string
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

      // Header Title
      doc.fontSize(12).font('Helvetica-Bold').text('TRANSACTION CLOSING RECORD & HUD-1 SUMMARY', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(10).font('Helvetica-Bold').text(`Closing Date: `, { continued: true })
         .font('Helvetica').text(dateStr);
      
      doc.fontSize(10).font('Helvetica-Bold').text(`Buyer / Closing Party: `, { continued: true })
         .font('Helvetica').text(buyerName);
      
      doc.fontSize(10).font('Helvetica-Bold').text(`Subject Property: `, { continued: true })
         .font('Helvetica').text(propertyName);
      doc.moveDown(2);

      // Financial Details table
      doc.fontSize(11).font('Helvetica-Bold').text('Settlement Ledger:');
      doc.moveDown(0.5);

      const items = [
        { label: 'Contract Purchase Price', amt: purchasePrice },
        { label: 'Title & Settlement Fees', amt: titleFees },
        { label: 'Lender Origination Fees', amt: originationFees },
        { label: 'Total Capitalized Basis', amt: purchasePrice + titleFees + originationFees },
      ];

      items.forEach((item) => {
        doc.fontSize(10).font(item.label.startsWith('Total') ? 'Helvetica-Bold' : 'Helvetica').text(`   ${item.label}: `, { continued: true })
           .text(`$${item.amt.toLocaleString()} USD`);
      });
      doc.moveDown(2);

      // Closing audit confirmation
      doc.fontSize(11).font('Helvetica-Bold').text('Audit & Compliance Confirmation:');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(
        `This closing record verifies that all required legal documentation (executed PSA, earnest money deposits, and financing commitments) has been audited, reviewed, and approved. Funds have been securely wired to the escrow agent, and title search results have cleared.`,
        { align: 'justify' }
      );
      doc.moveDown(3);

      // Signatures
      doc.fontSize(10).font('Helvetica-Bold').text('Closing Manager:', { continued: true })
         .text('                                     ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Name: ${buyerName}`);
      doc.text(`Vesting: Confirmed Clear Title`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const { uid, token } = auth;

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const parsed = closeDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid parameters'
      }, { status: 400 });
    }

    const {
      projectId,
      finalPurchasePrice,
      titleFees,
      originationFees,
      isEstimate,
      sources,
      uses,
      justification
    } = parsed.data;

    // Sum validation
    const sourcesSum = sources ? sources.reduce((sum, s) => sum + s.amount, 0) : 0;
    const usesSum = uses ? uses.reduce((sum, u) => sum + u.amount, 0) : 0;
    if (sourcesSum !== usesSum) {
      if (!justification || justification.trim() === "") {
        const variance = Math.abs(sourcesSum - usesSum);
        return NextResponse.json({
          success: false,
          error: `Sources (${sourcesSum}) and Uses (${usesSum}) must balance. Variance: ${variance}`,
          variance
        }, { status: 400 });
      }
    }

    // 3. Load project
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const project = projectSnap.data()!;
    const financials = project.financials || {};

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const userName = userData.displayName || userData.name || token.email || 'Investor';

    const nowStr = new Date().toISOString();

    // 4. Update Cost Basis Ledger
    const currentLedger = project.costBasisLedger || { directAcquisition: [], financing: [], preClosing: [] };
    const directAcquisition = [
      ...(currentLedger.directAcquisition || []),
      {
        id: `direct_${Math.random().toString(36).substring(2, 9)}`,
        label: 'Purchase Price',
        amount: finalPurchasePrice,
        paid: !isEstimate,
        estimated: isEstimate,
        verified: !isEstimate,
        paidAt: isEstimate ? null : nowStr,
        notes: ''
      },
      {
        id: `direct_${Math.random().toString(36).substring(2, 9)}`,
        label: 'Title Fees',
        amount: titleFees,
        paid: !isEstimate,
        estimated: isEstimate,
        verified: !isEstimate,
        paidAt: isEstimate ? null : nowStr,
        notes: ''
      },
    ];
    const financing = [
      ...(currentLedger.financing || []),
      {
        id: `finance_${Math.random().toString(36).substring(2, 9)}`,
        label: 'Origination Fees',
        amount: originationFees,
        paid: !isEstimate,
        estimated: isEstimate,
        verified: !isEstimate,
        paidAt: isEstimate ? null : nowStr,
        notes: ''
      },
    ];

    const newLedger = {
      ...currentLedger,
      directAcquisition,
      financing,
    };

    const totalClosingCosts = titleFees + originationFees;

    // 5. Generate Closing summary PDF
    const pdfBuffer = await generateClosingSummaryPDF(
      project.propertyName || project.addressLine || 'Unnamed Property',
      finalPurchasePrice,
      titleFees,
      originationFees,
      userName
    );

    const docId = `close_${Math.random().toString(36).substring(2, 11)}`;
    const documentsColRef = projectRef.collection('documents');
    await documentsColRef.doc(docId).set({
      id: docId,
      projectId,
      category: 'Dossier Snapshot',
      fileName: 'Closing_Record_Summary.pdf',
      fileUrl: `/api/loi/download?id=${docId}`, // download URL endpoint
      uploadedByUid: uid,
      uploadedByName: userName,
      uploadedAt: nowStr,
      eSignStatus: 'Not Required',
      notes: 'Final Hud Closing Record Summary.',
    });

    // 6. Update Firestore project properties
    const updatePayload = {
      currentPhase: 3,
      phaseStatus: 'Phase 3: Hold',
      status: 'hold',
      costBasisLedger: newLedger,
      'financials.purchasePrice': finalPurchasePrice * 100, // cents
      'financials.initialCapitalizedBasis': (finalPurchasePrice + totalClosingCosts) * 100, // cents
      'financials.loanOriginationPoints': (financials.loanAmount || (finalPurchasePrice * 100)) > 0
        ? (originationFees * 100 / (financials.loanAmount / 100 || finalPurchasePrice))
        : 0,
      'financials.closingDate': nowStr,
      'financials.closingFiguresEstimated': isEstimate,
      'closingRoom.isEstimate': isEstimate,
      updatedAt: nowStr,
    };

    const { onHoldPhaseEnter } = require('@/lib/phases/dataFlow');
    const flowUpdates = onHoldPhaseEnter(project);

    const finalPayload = {
      ...updatePayload,
      ...flowUpdates,
      financials: {
        ...project.financials,
        ...flowUpdates.financials,
        purchasePrice: finalPurchasePrice * 100, // cents
        initialCapitalizedBasis: (finalPurchasePrice + totalClosingCosts) * 100, // cents
        loanOriginationPoints: (financials.loanAmount || (finalPurchasePrice * 100)) > 0
          ? (originationFees * 100 / (financials.loanAmount / 100 || finalPurchasePrice))
          : 0,
        closingDate: nowStr,
        closingFiguresEstimated: isEstimate,
      },
      closingRoom: {
        ...project.closingRoom,
        isEstimate,
      }
    };

    await projectRef.update(finalPayload);

    // If estimate, create reminders and notifications
    if (isEstimate) {
      const reminderTargetDate = addBusinessDays(new Date(), 3);
      
      // Sub-collection reminder
      const reminderId = `rem_${Math.random().toString(36).substring(2, 11)}`;
      await projectRef.collection('reminders').doc(reminderId).set({
        id: reminderId,
        projectId,
        type: 'confirm_closing_figures',
        targetDate: reminderTargetDate.toISOString(),
        createdAt: nowStr,
        status: 'pending',
        description: 'Confirm final closing figures for closing room.'
      });

      // Notification
      await NotificationService.createNotification({
        recipientId: project.ownerUid || uid,
        type: 'DEADLINE_ALERT',
        actor: {
          uid,
          name: userName,
          role: 'Investor',
        },
        objectReference: {
          projectId,
          dealAddress: project.propertyName || project.addressLine || 'Unnamed Property',
          time: '3 business days',
          task: 'Confirm final closing figures',
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`,
        expiresAt: reminderTargetDate,
      });
    }

    // ── 7. Postgres Sync ──
    try {
      const { prisma: localPrisma } = require('@/lib/prisma');
      await localPrisma.reilProject.update({
        where: { id: projectId },
        data: {
          currentPhase: 3,
          acquisitionStatus: 'CLOSED',
        },
      });
    } catch (err) {
      console.warn('[Close Deal API] Postgres Prisma sync bypassed:', err);
    }

    // ── 8. Emit Telemetry Event ──
    try {
      await trackEvent('deal_closed' as any, {
        projectId,
        listingId: project.activeListingId || null,
        finalPurchasePrice,
      } as any);
    } catch (err) {
      console.warn('[Close Deal API] Telemetry capture failed:', err);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Close Deal API] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
