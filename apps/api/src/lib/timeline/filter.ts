export type DealActivityType =
  | 'edit'
  | 'republish'
  | 'mode_change'
  | 'indication'
  | string;

export interface TimelineActivity {
  id: string;
  projectId?: string;
  dealId?: string;
  actorUid?: string;
  type: DealActivityType;
  metadata?: { inviteeEmail?: string; [key: string]: unknown };
  createdAt: string;
}

const GENERAL_TIMELINE_TYPES = new Set<DealActivityType>(['edit', 'republish', 'mode_change']);

/**
 * Pure timeline filter — source: PaperWorking lib/invitations/activityTimeline.ts
 */
export function filterTimelineActivities(
  activities: TimelineActivity[],
  viewerUid: string,
  viewerEmails: string[],
  isLeadInvestorOrTeammate: boolean,
): TimelineActivity[] {
  if (isLeadInvestorOrTeammate) {
    return activities;
  }

  const normalizedEmails = viewerEmails.map((e) => e.toLowerCase().trim()).filter(Boolean);

  return activities.filter((act) => {
    if (GENERAL_TIMELINE_TYPES.has(act.type)) {
      return true;
    }

    if (act.actorUid === viewerUid) {
      return true;
    }

    const inviteeEmail = act.metadata?.inviteeEmail?.toLowerCase().trim();
    if (inviteeEmail && normalizedEmails.includes(inviteeEmail)) {
      return true;
    }

    return false;
  });
}

export function sortTimelineDescending(activities: TimelineActivity[]): TimelineActivity[] {
  return [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function isVendorAccount(user: { role?: string; accountType?: string } | null): boolean {
  if (!user) return false;
  return user.role === 'Vendor' || user.accountType === 'vendor';
}

export function isLeadInvestorOrTeammateRole(role: string | undefined): boolean {
  return role === 'Lead Investor' || role === 'GP' || role === 'General Contractor';
}
