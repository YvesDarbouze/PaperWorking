import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/projects/[id]/loans/hard-money-terms
 *
 * Configures Hard Money or Bridge loan terms on the route's existing loan record.
 * Reads dispositionType from the project — never re-asks it.
 *
 * Guarded: updates only the identified loan doc fields; never touches
 * other subcollection documents or unrelated financials fields.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Only Lead Investors can configure loan terms
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can configure loan terms' }, { status: 403 });
    }

    const project = access.project;

    const body = await request.json();
    const {
      loanId,
      arvCents,
      arvSource,
      interestRate,
      termMonths,
      points,
      interestOnly,
      amountCents,
    } = body;

    // ── Validation ───────────────────────────────────────────────────────
    if (!loanId || typeof loanId !== 'string') {
      return NextResponse.json({ error: 'loanId is required' }, { status: 422 });
    }

    // Fetch the specific loan doc
    const loanRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('loans')
      .doc(loanId);
    const loanSnap = await loanRef.get();

    if (!loanSnap.exists) {
      return NextResponse.json({ error: 'Loan record not found' }, { status: 404 });
    }

    const existingLoan = loanSnap.data()!;
    const instrument = existingLoan.instrument;

    if (instrument !== 'Hard Money' && instrument !== 'Bridge') {
      return NextResponse.json(
        { error: 'This endpoint only accepts Hard Money or Bridge loan records' },
        { status: 422 }
      );
    }

    if (arvCents != null && (typeof arvCents !== 'number' || arvCents < 0)) {
      return NextResponse.json({ error: 'arvCents must be a non-negative number' }, { status: 422 });
    }

    if (arvSource != null && !['user_assumption', 'arv_appraisal'].includes(arvSource)) {
      return NextResponse.json(
        { error: 'arvSource must be user_assumption or arv_appraisal' },
        { status: 422 }
      );
    }

    if (interestRate != null && (typeof interestRate !== 'number' || interestRate < 0 || interestRate > 100)) {
      return NextResponse.json({ error: 'interestRate must be 0-100' }, { status: 422 });
    }

    if (termMonths != null && (typeof termMonths !== 'number' || termMonths < 1 || termMonths > 360)) {
      return NextResponse.json({ error: 'termMonths must be 1-360' }, { status: 422 });
    }

    if (points != null && (typeof points !== 'number' || points < 0 || points > 20)) {
      return NextResponse.json({ error: 'points must be 0-20' }, { status: 422 });
    }

    if (amountCents != null && (typeof amountCents !== 'number' || amountCents < 0)) {
      return NextResponse.json({ error: 'amountCents must be a non-negative number' }, { status: 422 });
    }

    // ── Read dispositionType from project — never re-ask ─────────────────
    const exitPlan = project.dispositionType || null; // 'SALE' | 'LEASE' | 'RENT' | null

    // ── Compute LTARV % ──────────────────────────────────────────────────
    const finalAmountCents = amountCents ?? existingLoan.amountCents ?? 0;
    const finalArvCents = arvCents ?? existingLoan.arvCents ?? 0;
    const ltarvPercent =
      finalArvCents > 0
        ? parseFloat(((finalAmountCents / finalArvCents) * 100).toFixed(2))
        : null;

    // ── Compute debt service via shared amortization utility ──────────────
    const finalRate = interestRate ?? existingLoan.interestRate ?? 0;
    const finalTermMonths = termMonths ?? existingLoan.termMonths ?? 12;
    const isIO = interestOnly ?? existingLoan.interestOnly ?? false;
    const amtDollars = finalAmountCents / 100;

    const amort = calculateAmortization(amtDollars, finalRate, finalTermMonths, isIO);

    // ── Build update payload (guarded — only touch loan doc fields) ───────
    const now = new Date().toISOString();
    const update: Record<string, any> = {
      exitPlan,
      interestOnly: isIO,
      ltarvPercent,
      updatedAt: now,
    };

    if (arvCents != null) update.arvCents = arvCents;
    if (arvSource != null) update.arvSource = arvSource;
    if (interestRate != null) update.interestRate = interestRate;
    if (termMonths != null) update.termMonths = termMonths;
    if (points != null) update.points = points;
    if (amountCents != null) update.amountCents = amountCents;

    await loanRef.update(update);

    // ── Set compressed timeline template on project financials ────────────
    const currentFinancials = project.financials || {};
    const financialUpdates: Record<string, any> = {
      'financials.timelineTemplate': 'compressed',
    };

    // Write annual debt service so locked terms can pick it up
    financialUpdates['financials.annualDebtService'] = parseFloat(amort.annualDebtService.toFixed(2));

    await adminDb.collection('projects').doc(projectId).update(financialUpdates);

    // ── Timeline + Notification ──────────────────────────────────────────
    await writeActivityLog(
      projectId,
      uid,
      [{
        fieldPath: `loans.${loanId}.termMonths`,
        oldValue: existingLoan.termMonths || null,
        newValue: finalTermMonths,
      }],
      'manual'
    );

    const dealAddress = project.propertyName || project.address?.street || 'the project';
    try {
      const actorName = auth.token.name || auth.token.email || 'A teammate';
      const recipient = project.ownerUid || uid;

      if (typeof NotificationService.broadcastProjectNotification === 'function') {
        await NotificationService.broadcastProjectNotification(projectId, {
          type: 'LOAN_STATUS_UPDATE',
          actor: { uid, name: actorName },
          objectReference: {
            projectId,
            dealAddress,
            task: `${instrument} terms configured: ${finalRate}% ${isIO ? 'I/O' : 'amort'}, ${finalTermMonths}mo`,
          },
          deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`,
        });
      } else {
        await NotificationService.createNotification({
          recipientId: recipient,
          type: 'LOAN_STATUS_UPDATE',
          actor: { uid, name: actorName },
          objectReference: {
            projectId,
            dealAddress,
            task: `${instrument} terms configured: ${finalRate}% ${isIO ? 'I/O' : 'amort'}, ${finalTermMonths}mo`,
          },
          deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`,
        });
      }
    } catch (err: any) {
      console.error('Failed to trigger hard money terms notification:', err.message);
    }

    return NextResponse.json({
      success: true,
      loan: {
        id: loanId,
        instrument,
        amountCents: finalAmountCents,
        arvCents: finalArvCents,
        ltarvPercent,
        interestRate: finalRate,
        termMonths: finalTermMonths,
        points: points ?? existingLoan.points ?? 0,
        interestOnly: isIO,
        exitPlan,
      },
      debtService: {
        monthlyPayment: parseFloat(amort.monthlyPayment.toFixed(2)),
        annualDebtService: parseFloat(amort.annualDebtService.toFixed(2)),
        firstYearInterest: parseFloat(amort.firstYearInterest.toFixed(2)),
        firstYearPrincipal: parseFloat(amort.firstYearPrincipal.toFixed(2)),
      },
    });
  } catch (err: any) {
    console.error('[Hard Money Terms API]', err.message);
    return NextResponse.json({ error: 'Failed to configure hard money terms' }, { status: 500 });
  }
}
