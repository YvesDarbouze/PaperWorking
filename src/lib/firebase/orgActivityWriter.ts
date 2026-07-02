import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ActivityType } from './activityLogger';

/* ═══════════════════════════════════════════════════════
   Org Activity Writer — Server-Side (Admin SDK)

   Appends activity events to organizations/{orgId}/activity.
   Called from API routes after a successful write; never
   blocks the primary response (all errors are swallowed).

   Schema (per document):
     type        ActivityType
     actorId     string  — Firebase UID
     actorName   string  — display name or email
     actorUid    string  — alias for actorId (client-reader compat)
     summary     string  — human-readable description
     description string  — alias for summary (client-reader compat)
     targetRef   string? — e.g. "projects/{projectId}"
     projectId   string?
     projectName string?
     createdAt   Timestamp (server-side)
   ═══════════════════════════════════════════════════════ */

export interface OrgActivityParams {
  organizationId: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  summary: string;
  targetRef?: string;
  projectId?: string;
  projectName?: string;
}

export async function logOrgActivity(params: OrgActivityParams): Promise<void> {
  try {
    const activityRef = adminDb
      .collection('organizations')
      .doc(params.organizationId)
      .collection('activity');

    await activityRef.add({
      type: params.type,
      actorId: params.actorId,
      actorUid: params.actorId,
      actorName: params.actorName,
      summary: params.summary,
      description: params.summary,
      targetRef: params.targetRef ?? null,
      projectId: params.projectId ?? null,
      projectName: params.projectName ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[logOrgActivity] Failed to write activity event:', error);
  }
}
