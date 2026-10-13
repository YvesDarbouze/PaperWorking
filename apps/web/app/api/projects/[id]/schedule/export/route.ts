import { filterScheduleForGuest, resolveProjectAccess } from '@/lib/projects/project-access';
import { buildProjectSchedule } from '@/lib/projects/schedule';
import { buildProjectIcs } from '@/lib/projects/ical';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;

  const { project } = access;
  const schedule = buildProjectSchedule(project);
  const events = access.kind === 'guest' ? filterScheduleForGuest(schedule) : schedule;
  const ics = buildProjectIcs({ calendarName: `${project.propertyName} Milestones`, events });

  const safeFileId = project.id.replace(/[^a-zA-Z0-9_-]/g, '');
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFileId}-calendar.ics"`,
    },
  });
}
