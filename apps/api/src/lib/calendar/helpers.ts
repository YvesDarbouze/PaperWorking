export type CalendarEventType = 'inspection' | 'closing' | 'appraisal' | 'listing' | 'custom';

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, number> = {
  inspection: 5,
  closing: 2,
  appraisal: 6,
  listing: 9,
  custom: 1,
};

export interface CalendarEventSummary {
  id?: string;
  summary?: string;
  start?: string;
  end?: string;
  htmlLink?: string;
  location?: string;
  conferenceData?: unknown;
}

export function mapCalendarEvents(events: Array<Record<string, unknown>>): CalendarEventSummary[] {
  return events.map((event) => {
    const start = event.start as Record<string, string> | undefined;
    const end = event.end as Record<string, string> | undefined;
    return {
      id: event.id as string | undefined,
      summary: event.summary as string | undefined,
      start: start?.dateTime || start?.date,
      end: end?.dateTime || end?.date,
      htmlLink: event.htmlLink as string | undefined,
      location: event.location as string | undefined,
      conferenceData: event.conferenceData,
    };
  });
}

export function isInvalidGrantError(message?: string): boolean {
  if (!message) return false;
  return message.includes('invalid_grant') || message.includes('revoked');
}

export function validateCalendarSyncBody(body: {
  idToken?: unknown;
  projectId?: unknown;
  title?: unknown;
  date?: unknown;
  eventType?: unknown;
  durationMinutes?: unknown;
  description?: unknown;
  attendeeEmails?: unknown;
  existingEventId?: unknown;
}):
  | {
      ok: true;
      projectId: string;
      title: string;
      date: string;
      eventType: CalendarEventType;
      durationMinutes: number;
      description: string;
      attendeeEmails: string[];
      existingEventId?: string;
    }
  | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';

  if (!idToken || !projectId || !title || !date) {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, title, date',
      status: 400,
    };
  }

  const eventTypeRaw = typeof body.eventType === 'string' ? body.eventType : 'custom';
  const eventType = (['inspection', 'closing', 'appraisal', 'listing', 'custom'] as const).includes(
    eventTypeRaw as CalendarEventType,
  )
    ? (eventTypeRaw as CalendarEventType)
    : 'custom';

  return {
    ok: true,
    projectId,
    title,
    date,
    eventType,
    durationMinutes:
      typeof body.durationMinutes === 'number' && body.durationMinutes > 0
        ? body.durationMinutes
        : 60,
    description: typeof body.description === 'string' ? body.description : '',
    attendeeEmails: Array.isArray(body.attendeeEmails)
      ? body.attendeeEmails.filter((email): email is string => typeof email === 'string')
      : [],
    existingEventId:
      typeof body.existingEventId === 'string' ? body.existingEventId : undefined,
  };
}

export function buildCalendarEventTimes(
  date: string,
  durationMinutes: number,
): { startIso: string; endIso: string } {
  const startDt = new Date(date);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60_000);
  return { startIso: startDt.toISOString(), endIso: endDt.toISOString() };
}

export function buildCalendarSyncDescription(
  description: string,
  propertyName: string | undefined,
  projectId: string,
): string {
  return description || `PaperWorking deal milestone — ${propertyName || projectId}`;
}
