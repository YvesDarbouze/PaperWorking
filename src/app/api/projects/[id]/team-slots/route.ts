import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/projects/[id]/team-slots
 *
 * Assigns or clears a single F4 vendor slot. Accepts structured vendor
 * records (marketplace or off-platform) or null to clear.
 *
 * Guarded: updates only the targeted financials field, never touches
 * other financials properties.
 */

const VALID_SLOT_KEYS = [
  'f4TitleEscrowVendor',
  'f4ClosingAttorneyVendor',
  'f4AppraiserVendor',
  'f4EnvironmentalVendor',
  'f4SurveyorVendor',
  'f4InsuranceBrokerVendor',
  'f4CdcVendor',
  'f4HardMoneyLenderVendor',
] as const;

type SlotKey = typeof VALID_SLOT_KEYS[number];

const VALID_SOURCES = ['marketplace', 'off_platform', 'carried_forward'] as const;

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { slotKey, assignment } = body;

    // ── Validate slot key ────────────────────────────────────────────────
    if (!slotKey || !VALID_SLOT_KEYS.includes(slotKey as SlotKey)) {
      return NextResponse.json(
        { error: `Invalid slotKey. Must be one of: ${VALID_SLOT_KEYS.join(', ')}` },
        { status: 422 }
      );
    }

    // ── Validate assignment (or null to clear) ───────────────────────────
    if (assignment !== null && assignment !== undefined) {
      if (typeof assignment !== 'object') {
        return NextResponse.json(
          { error: 'assignment must be an object or null' },
          { status: 422 }
        );
      }

      if (!assignment.name || typeof assignment.name !== 'string' || !assignment.name.trim()) {
        return NextResponse.json(
          { error: 'assignment.name is required' },
          { status: 422 }
        );
      }

      if (!assignment.source || !VALID_SOURCES.includes(assignment.source)) {
        return NextResponse.json(
          { error: `assignment.source must be one of: ${VALID_SOURCES.join(', ')}` },
          { status: 422 }
        );
      }
    }

    // ── Build the structured record ──────────────────────────────────────
    const now = new Date().toISOString();
    const actorName = auth.token.name || auth.token.email || 'A teammate';

    const vendorRecord = assignment
      ? {
          name: assignment.name.trim(),
          firm: assignment.firm?.trim() || null,
          phone: assignment.phone?.trim() || null,
          email: assignment.email?.trim() || null,
          source: assignment.source,
          marketplaceVendorId: assignment.marketplaceVendorId || null,
          assignedAt: now,
          assignedBy: uid,
        }
      : null;

    // ── Guarded write — only touch the one financials field ───────────────
    const updatePath = `financials.${slotKey}`;
    await adminDb.collection('projects').doc(projectId).update({
      [updatePath]: vendorRecord,
    });

    // ── Timeline ─────────────────────────────────────────────────────────
    const oldValue = project.financials?.[slotKey] || null;
    const oldName = typeof oldValue === 'string' ? oldValue : oldValue?.name || null;
    const newName = vendorRecord?.name || null;

    await writeActivityLog(
      projectId,
      uid,
      [{
        fieldPath: `financials.${slotKey}`,
        oldValue: oldName,
        newValue: newName,
      }],
      'manual'
    );

    // ── Notification ─────────────────────────────────────────────────────
    const dealAddress = project.propertyName || project.address?.street || 'the project';
    const slotLabel = slotKey.replace('f4', '').replace('Vendor', '').replace(/([A-Z])/g, ' $1').trim();

    try {
      const recipient = project.ownerUid || uid;
      await NotificationService.createNotification({
        recipientId: recipient,
        type: 'TASK_ASSIGNED',
        actor: { uid, name: actorName },
        objectReference: {
          projectId,
          dealAddress,
          task: vendorRecord
            ? `${slotLabel} assigned: ${vendorRecord.name}${vendorRecord.firm ? ` (${vendorRecord.firm})` : ''}`
            : `${slotLabel} cleared`,
        },
        deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`,
      });
    } catch (err: any) {
      console.error('Failed to trigger team slot notification:', err.message);
    }

    return NextResponse.json({
      success: true,
      slotKey,
      assignment: vendorRecord,
    });
  } catch (err: any) {
    console.error('[Team Slots API]', err.message);
    return NextResponse.json({ error: 'Failed to update team slot' }, { status: 500 });
  }
}
