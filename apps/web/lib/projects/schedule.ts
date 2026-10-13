import type { ContingencyItem, ProjectScheduleEvent, ProjectWorkspace } from './types';

const CLOSED_CONTINGENCY_STATUSES = new Set(['satisfied', 'waived']);

/** Calendar date (YYYY-MM-DD) of an ISO instant in the project's timezone. */
function localDateOf(isoInstant: string, timeZone?: string): string | null {
  const instant = new Date(isoInstant);
  if (Number.isNaN(instant.getTime())) return null;
  if (!timeZone) return instant.toISOString().slice(0, 10);
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Read-only schedule entries derived from contingency deadlines. */
export function contingencyScheduleEntries(
  contingencies: ContingencyItem[] | undefined,
  timeZone?: string,
): ProjectScheduleEvent[] {
  const entries: ProjectScheduleEvent[] = [];
  for (const c of contingencies ?? []) {
    if (!c?.deadline) continue;
    const date = localDateOf(c.deadline, timeZone);
    if (!date) continue;
    entries.push({
      id: `contingency-${c.id}`,
      title: c.label,
      date,
      category: 'contingency',
      phase: 'acquisition',
      isHardDate: !CLOSED_CONTINGENCY_STATUSES.has(c.status),
      ...(c.notes ? { notes: c.notes } : {}),
      vendorVisible: false,
      source: 'contingency',
      status: c.status,
      responsibleParty: c.responsiblePartyName,
    });
  }
  return entries;
}

/** Manual events plus contingency deadlines, sorted by date. */
export function buildProjectSchedule(
  project: Pick<ProjectWorkspace, 'scheduleEvents' | 'contingencies'> & { ianaTimezone?: string },
): ProjectScheduleEvent[] {
  const manual = (project.scheduleEvents ?? []).map((e) => ({ ...e, source: 'manual' as const }));
  const derived = contingencyScheduleEntries(project.contingencies, project.ianaTimezone);
  return [...manual, ...derived].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
