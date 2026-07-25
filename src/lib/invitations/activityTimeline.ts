import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export type DealActivityType =
  | 'invite'
  | 'open'
  | 'question'
  | 'answer'
  | 'decline'
  | 'interest'
  | 'exchange'
  | 'indication'
  | 'edit'
  | 'republish'
  | 'mode_change';

export interface DealActivity {
  id: string;
  projectId: string;
  dealId: string;
  actorUid: string;
  type: DealActivityType;
  metadata: {
    inviteeEmail?: string;
    inviteeName?: string;
    questionText?: string;
    answerText?: string;
    amountCents?: number;
    oldVisibilityMode?: string;
    newVisibilityMode?: string;
    editSummary?: string;
    [key: string]: any;
  };
  createdAt: any;
}

/**
 * Persists an application-level deal activity timeline event.
 */
export async function trackDealActivity(
  projectId: string,
  dealId: string,
  actorUid: string,
  type: DealActivityType,
  metadata: Record<string, any> = {}
): Promise<string> {
  try {
    const docRef = adminDb.collection('dealActivityTimeline').doc();
    const entry = {
      id: docRef.id,
      projectId,
      dealId,
      actorUid,
      type,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(entry);
    return docRef.id;
  } catch (err: any) {
    console.error('[trackDealActivity Error]', err.message);
    return '';
  }
}

/**
 * Filter timeline activities securely based on viewer identity and role.
 */
export async function filterTimelineForUser(
  activities: DealActivity[],
  viewerUid: string,
  viewerEmail: string,
  isLeadInvestorOrTeammate: boolean
): Promise<DealActivity[]> {
  if (isLeadInvestorOrTeammate) {
    return activities;
  }

  // Retrieve any claimed emails to authorize view of historical records
  const userSnap = await adminDb.collection('users').doc(viewerUid).get();
  const claimedEmails: string[] = userSnap.exists ? (userSnap.data()?.claimedEmails || []) : [];
  
  const lowerEmail = viewerEmail.toLowerCase().trim();
  const allUserEmails = [lowerEmail, ...claimedEmails.map(e => e.toLowerCase().trim())].filter(Boolean);

  const GENERAL_TYPES = new Set<DealActivityType>(['edit', 'republish', 'mode_change']);

  return activities.filter((act) => {
    // 1. General events (deal listing edits, republished, mode changes) are safe to show
    if (GENERAL_TYPES.has(act.type)) {
      return true;
    }

    // 2. Otherwise, check if user is the direct actor or invitee subject
    if (act.actorUid === viewerUid) {
      return true;
    }

    const inviteeEmail = act.metadata?.inviteeEmail?.toLowerCase().trim();
    if (inviteeEmail && allUserEmails.includes(inviteeEmail)) {
      return true;
    }

    return false;
  });
}
