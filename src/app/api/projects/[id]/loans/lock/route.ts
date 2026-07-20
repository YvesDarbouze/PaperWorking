import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';
import { calculateAmortization } from '@/lib/utils/reiCalculators';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

export async function POST(
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

    // Only Lead Investors can lock terms
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can lock terms' }, { status: 403 });
    }

    const project = access.project;

    const loansSnap = await adminDb
      .collection('projects')
      .doc(projectId)
      .collection('loans')
      .get();

    const loans = loansSnap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })) as any[];

    if (loans.length === 0) {
      return NextResponse.json({ error: 'No active loans found to lock.' }, { status: 400 });
    }

    let totalAmountCents = 0;
    let totalAnnualDebtService = 0;
    let interestProductSum = 0;
    let termProductSum = 0;
    let pointsProductSum = 0;

    for (const loan of loans) {
      const amtCents = loan.amountCents || 0;
      totalAmountCents += amtCents;

      // Amortization output is in dollars
      const amtDollars = amtCents / 100;
      const rate = loan.interestRate || 0;
      const termMonths = loan.termMonths || 360;
      const points = loan.points || 0;

      const amort = calculateAmortization(amtDollars, rate, termMonths);
      totalAnnualDebtService += amort.annualDebtService;

      interestProductSum += rate * amtCents;
      termProductSum += (termMonths / 12) * amtCents;
      pointsProductSum += points * amtCents;
    }

    if (totalAmountCents === 0) {
      return NextResponse.json({ error: 'Configure loan amounts before locking terms.' }, { status: 400 });
    }

    const finalAmount = totalAmountCents / 100;
    const finalRate = parseFloat((interestProductSum / totalAmountCents).toFixed(4));
    const finalTermYears = parseFloat((termProductSum / totalAmountCents).toFixed(4));
    const finalPoints = parseFloat((pointsProductSum / totalAmountCents).toFixed(4));
    const finalAnnualDebtService = parseFloat(totalAnnualDebtService.toFixed(2));

    const currentFinancials = project.financials || {};
    const oldAmount = currentFinancials.loanAmount || 0;

    const activeLoan = loans[0];
    const sourceTags = {
      ...(currentFinancials.sourceTags || {}),
      loan_amount: activeLoan?.sourceTags?.amountCents || (activeLoan?.fileId ? 'document' : 'manual'),
      loan_interest_rate: activeLoan?.sourceTags?.interestRate || (activeLoan?.fileId ? 'document' : 'manual'),
      loan_term: activeLoan?.sourceTags?.termMonths || (activeLoan?.fileId ? 'document' : 'manual'),
      loanOriginationPoints: activeLoan?.sourceTags?.points || (activeLoan?.fileId ? 'document' : 'manual'),
    };

    const updatedFinancials = {
      ...currentFinancials,
      loanAmount: finalAmount,
      loanInterestRate: finalRate,
      loanTermYears: finalTermYears,
      loanOriginationPoints: finalPoints,
      annualDebtService: finalAnnualDebtService,
      sourceTags
    };

    await adminDb.collection('projects').doc(projectId).update({
      financials: updatedFinancials,
      termsLocked: true,
      termsLockedAt: new Date().toISOString(),
      termsLockedBy: uid
    });

    // Write to timeline activityLog
    await writeActivityLog(
      projectId,
      uid,
      [{
        fieldPath: 'financials.loanAmount',
        oldValue: oldAmount,
        newValue: finalAmount
      }],
      'manual'
    );

    // Fire notification to project members
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
            task: `Locked loan terms: $${finalAmount.toLocaleString()} at ${finalRate}%`
          },
          deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`
        });
      } else {
        await NotificationService.createNotification({
          recipientId: recipient,
          type: 'LOAN_STATUS_UPDATE',
          actor: { uid, name: actorName },
          objectReference: {
            projectId,
            dealAddress,
            task: `Locked loan terms: $${finalAmount.toLocaleString()} at ${finalRate}%`
          },
          deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`
        });
      }
    } catch (err: any) {
      console.error('Failed to trigger lock terms notification:', err.message);
    }

    return NextResponse.json({
      success: true,
      lockedTerms: {
        loanAmount: finalAmount,
        loanInterestRate: finalRate,
        loanTermYears: finalTermYears,
        loanOriginationPoints: finalPoints,
        annualDebtService: finalAnnualDebtService
      }
    });
  } catch (err: any) {
    console.error('[Lock Terms API]', err.message);
    return NextResponse.json({ error: 'Failed to lock terms' }, { status: 500 });
  }
}
