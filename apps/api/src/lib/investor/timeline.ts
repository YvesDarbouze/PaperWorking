import type { TimelineActivity } from '../timeline/filter.js';

export function filterInvestorTimeline(
  activities: TimelineActivity[],
  ownedProjectIds: Set<string>,
  viewerUid: string,
  viewerEmails: string[],
): TimelineActivity[] {
  const normalizedEmails = viewerEmails.map((e) => e.toLowerCase().trim()).filter(Boolean);

  return activities.filter((act) => {
    if (act.projectId && ownedProjectIds.has(act.projectId)) return true;
    if (act.actorUid === viewerUid) return true;

    const inviteeEmail = act.metadata?.inviteeEmail?.toLowerCase().trim();
    if (inviteeEmail && normalizedEmails.includes(inviteeEmail)) return true;

    return false;
  });
}

export function sortTimelineNewestFirst(activities: TimelineActivity[]): TimelineActivity[] {
  return [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
