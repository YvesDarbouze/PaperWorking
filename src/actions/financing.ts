'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NotificationService } from '@/lib/services/notificationService';
import { LoanRecord, LoanRecordStatus } from '@/types/schema';

interface TransitionLoanStatusParams {
  projectId: string;
  loanId: string;
  newStatus: LoanRecordStatus;
  appraisedValue?: number;
  appraisalDocumentUrl?: string;
  appraisalDocumentName?: string;
}

export async function transitionLoanStatus({
  projectId,
  loanId,
  newStatus,
  appraisedValue,
  appraisalDocumentUrl,
  appraisalDocumentName
}: TransitionLoanStatusParams) {
  try {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new Error('Project not found');
    }
    const projectData = projectSnap.data()!;

    const address = projectData.address ?? projectData.propertyName ?? 'Unknown Property';
    const ownerUid = projectData.ownerUid;

    const loans = (projectData.loans as any[] | undefined) ?? [];
    const loanIndex = loans.findIndex((l) => l.id === loanId);
    if (loanIndex === -1) {
      throw new Error('Loan record not found');
    }

    const currentLoan = loans[loanIndex];
    const oldStatus = currentLoan.status || 'unknown';

    const updatedLoan: any = {
      ...currentLoan,
      status: newStatus,
      updatedAt: new Date()
    };

    if (newStatus === 'appraisal_received' && appraisedValue !== undefined) {
      updatedLoan.appraisedValue = appraisedValue;
      if (appraisalDocumentUrl) {
        updatedLoan.appraisalDocumentUrl = appraisalDocumentUrl;
      }
      if (appraisalDocumentName) {
        updatedLoan.appraisalDocumentName = appraisalDocumentName;
      }
    }

    const updatedLoans = [...loans];
    updatedLoans[loanIndex] = updatedLoan;

    const updates: Record<string, any> = {
      loans: updatedLoans,
      loanStatus: newStatus
    };

    // If this is the active loan, sync project financials
    if (!currentLoan.archived) {
      const currentFinancials = projectData.financials ?? {};
      const updatedFinancials = {
        ...currentFinancials,
        loanAmount: currentLoan.amount,
        loanInterestRate: currentLoan.rate,
        loanTermYears: currentLoan.termYears,
        loanOriginationPoints: currentLoan.points
      };

      if (newStatus === 'appraisal_received' && appraisedValue !== undefined) {
        updatedFinancials.estimatedCurrentValue = appraisedValue;
      }

      updates.financials = updatedFinancials;
    }

    await projectRef.update(updates);

    // Create deal update (timeline log)
    const timelineRef = projectRef.collection('dealUpdates').doc();
    const title = `Loan Milestone: ${newStatus.replace(/_/g, ' ').toUpperCase()}`;
    const body = `Loan with lender "${currentLoan.lender}" transitioned from ${String(oldStatus).replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')}.${
      newStatus === 'appraisal_received' && appraisedValue !== undefined
        ? ` Appraised Value captured: $${appraisedValue.toLocaleString()}.`
        : ''
    }`;

    await timelineRef.set({
      projectId,
      organizationId: projectData.organizationId ?? null,
      authorUid: 'system',
      authorName: 'System Bot',
      title,
      body,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Fire notification to project owner
    if (ownerUid) {
      await NotificationService.createNotification({
        recipientId: ownerUid,
        type: 'NEGOTIATION_UPDATE',
        actor: {
          uid: 'system',
          name: 'PaperWorking Finance Engine'
        },
        objectReference: {
          projectId,
          dealAddress: address,
          metadata: {
            title,
            body,
            alertType: 'LOAN_UNDERWRITING_MILESTONE'
          }
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[transitionLoanStatus ERROR]:', err);
    throw new Error(err.message || 'Failed to transition loan status');
  }
}
