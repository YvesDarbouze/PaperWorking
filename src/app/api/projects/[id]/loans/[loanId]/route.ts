import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

async function verifyProjectMembership(projectId: string, uid: string) {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const isOwner = data.ownerUid === uid;
  const isMember = !!data.members?.[uid] || data.teamMemberIds?.includes(uid);
  const isOrgMember = data.organizationId
    ? await adminDb.collection('organizations').doc(data.organizationId).get().then((o) => {
        if (!o.exists) return false;
        const od = o.data()!;
        return od.ownerUid === uid || od.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');
      })
    : false;
  if (!isOwner && !isMember && !isOrgMember) return null;
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; loanId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId, loanId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status,
      appraisedValueCents,
      appraisalFileId,
      appraisalFileName,
      appraisalFileUrl
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

    // If status changed, post to timeline (activityLog) and fire notifications
    if (status && status !== oldStatus) {
      // 1. Post to timeline
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

      // 2. Update project level loanStatus
      await adminDb.collection('projects').doc(projectId).update({
        loanStatus: status
      });

      // 3. Fire notification to project members/owner
      const dealAddress = project.propertyName || project.address?.street || 'the project';
      try {
        const actorName = auth.token.name || auth.token.email || 'A teammate';
        const recipient = project.ownerUid || uid;

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
