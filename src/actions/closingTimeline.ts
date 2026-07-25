"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ClosingMilestone } from '@/types/schema';
import { telemetry } from '@/lib/telemetry';

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function verifyAuth(idToken: string) {
  if (!idToken) throw new Error('Unauthorized');
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) throw new Error('User profile not found.');
    const data = userSnap.data() as Record<string, unknown>;
    return {
      uid: decoded.uid,
      displayName: (data.displayName as string) || (decoded.email as string) || 'Unknown',
      organizationId: data.organizationId as string,
      ...data,
    };
  } catch {
    throw new Error('Unauthorized');
  }
}

// ─── Scope/Access check ──────────────────────────────────────────────────────
async function verifyProjectAccess(projectId: string, uid: string, organizationId: string) {
  const projectRef = adminDb.collection('projects').doc(projectId);
  const snap = await projectRef.get();
  if (!snap.exists) throw new Error('Project not found.');
  const data = snap.data()!;

  // Owner check
  if (data.ownerUid === uid) return data;

  // Organization match
  if (data.organizationId === organizationId) return data;

  // Team membership check
  if (data.members?.[uid]) return data;
  if (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(uid)) return data;

  throw new Error('You do not have access to this project.');
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function updateClosingTimelineAction(
  idToken: string,
  projectId: string,
  milestones: ClosingMilestone[],
  template?: 'financed_conventional' | 'cash_hard_money' | 'sba' | null
): Promise<{ success: boolean; data: { closingTimeline: ClosingMilestone[]; closingTimelineTemplate?: string | null } }> {
  const user = await verifyAuth(idToken);
  await verifyProjectAccess(projectId, user.uid, user.organizationId);

  const updatePayload: Record<string, any> = {
    closingTimeline: milestones,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (template !== undefined) {
    updatePayload.closingTimelineTemplate = template;
  }

  await adminDb.collection('projects').doc(projectId).update(updatePayload);

  try {
    await telemetry.capture({
      distinctId: user.uid,
      event: 'closing_timeline_updated',
      properties: {
        projectId,
        template,
        milestoneCount: milestones.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Non-fatal telemetry error
    console.warn('[closingTimelineAction] Telemetry capture failed:', err);
  }

  return {
    success: true,
    data: {
      closingTimeline: milestones,
      closingTimelineTemplate: template ?? null,
    },
  };
}
