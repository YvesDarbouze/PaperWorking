import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';
import { verifyProjectAccessAndRole, authorizeProjectMutation } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; loanId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, loanId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token?.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }
    const project = access.project;

    const currentPhase = project.currentPhase || 1;
    const phaseKey = `phase-${currentPhase}` as 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';
    const authCheck = authorizeProjectMutation(access, phaseKey, {
      allowVendorSlot: ['f4HardMoneyLenderVendor', 'f4CdcVendor', 'f4AppraiserVendor']
    });
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status || 403 });
    }

    // Enforce LP access control explicitly as well
    if (access.role === 'LP') {
      return NextResponse.json({ error: 'Access denied: LPs cannot update loan records.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status,
      appraisedValueCents,
      appraisalFileId,
      appraisalFileName,
      appraisalFileUrl,
      note,
      fileId,
      fileName,
      fileUrl
    } = body;

    const loanRef = adminDb
      .collection('projects')
      .doc(projectId)
      .collection('loans')
      .doc(loanId);

    const loanSnap = await loanRef.get();
    if (!loanSnap.exists) {
      return NextResponse.json({ error: 'Loan record not found' }, { status: 404 });
    }

    const loanData = loanSnap.data()!;
    const oldStatus = loanData.status;

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (status) {
      const VALID_STATUSES = [
        'Application-Submitted',
        'Processing',
        'Appraisal-Ordered',
        'Appraisal-Received',
        'Conditions-Issued',
        'Conditions-Cleared',
        'Clear-To-Close'
      ];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: `Invalid loan status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
      }
      updateData.status = status;
    }

    // Handle Appraisal Details and LTV recalculation
    if (appraisedValueCents !== undefined) {
      updateData.appraisedValueCents = appraisedValueCents;
    }
    if (appraisalFileId !== undefined) updateData.appraisalFileId = appraisalFileId;
    if (appraisalFileName !== undefined) updateData.appraisalFileName = appraisalFileName;
    if (appraisalFileUrl !== undefined) updateData.appraisalFileUrl = appraisalFileUrl;

    const activeAmount = loanData.amountCents || 0;
    const activeAppraised = appraisedValueCents !== undefined ? appraisedValueCents : (loanData.appraisedValueCents || 0);

    if (activeAppraised > 0) {
      updateData.ltvPercent = parseFloat(((activeAmount / activeAppraised) * 100).toFixed(2));
    } else {
      updateData.ltvPercent = null;
    }

    await loanRef.update(updateData);

    // If status changed, post to timeline (activityLog), write to transitions log, and fire notifications
    if (status && status !== oldStatus) {
      const actorName = auth.token.name || auth.token.email || 'A teammate';

      // 1. Write to transitions log subcollection
      const transitionRef = loanRef.collection('transitions').doc();
      await transitionRef.set({
        id: transitionRef.id,
        fromStatus: oldStatus || null,
        toStatus: status,
        timestamp: new Date().toISOString(),
        actor: {
          uid,
          name: actorName
        },
        note: note || null,
        fileId: fileId || appraisalFileId || null,
        fileName: fileName || appraisalFileName || null,
        fileUrl: fileUrl || appraisalFileUrl || null
      });

      // 2. Post to timeline
      await writeActivityLog(
        projectId,
        uid,
        [{
          fieldPath: `loans.${loanId}.status`,
          oldValue: oldStatus,
          newValue: status
        }],
        'manual'
      );

      // 3. Update project level loanStatus
      await adminDb.collection('projects').doc(projectId).update({
        loanStatus: status
      });

      // Enqueue timeline sync
      try {
        const { jobQueue } = await import('@/lib/queue/jobQueue');
        await jobQueue.enqueue('timeline_sync', { projectId });
      } catch (err: any) {
        console.error('Failed to enqueue timeline sync on loanStatus update:', err.message);
      }

      // 4. Fire notification to project members/owner
      const dealAddress = project.propertyName || project.address?.street || 'the project';
      try {
        const recipient = project.ownerUid || uid;

        if (typeof NotificationService.broadcastProjectNotification === 'function') {
          await NotificationService.broadcastProjectNotification(projectId, {
            type: 'LOAN_STATUS_UPDATE',
            actor: { uid, name: actorName },
            objectReference: {
              projectId,
              dealAddress,
              task: `Loan status changed from ${oldStatus.replace(/-/g, ' ')} to ${status.replace(/-/g, ' ')}`
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
              task: `Loan status changed from ${oldStatus.replace(/-/g, ' ')} to ${status.replace(/-/g, ' ')}`
            },
            deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`
          });
        }
      } catch (err: any) {
        console.error('Failed to trigger milestone notification:', err.message);
      }
    }

    const updatedSnap = await loanRef.get();
    return NextResponse.json({ loan: { id: loanId, ...updatedSnap.data() } });
  } catch (err: any) {
    console.error('[Loan Record PATCH]', err.message);
    return NextResponse.json({ error: 'Failed to update loan record' }, { status: 500 });
  }
}
