import { NextResponse } from 'next/server';
import { scheduleEventCreateSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  filterScheduleForGuest,
  guestForbidden,
  newProjectItemId,
  parseProjectBody,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import { buildProjectSchedule } from '@/lib/projects/schedule';
import type { ProjectScheduleEvent } from '@/lib/projects/types';

/** GET returns manual events plus read-only entries derived from contingency deadlines. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;

  const events = buildProjectSchedule(access.project);
  return NextResponse.json({
    events: access.kind === 'guest' ? filterScheduleForGuest(events) : events,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, scheduleEventCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const newEvent: ProjectScheduleEvent = {
    id: newProjectItemId('evt'),
    title: body.title,
    date: body.date,
    category: body.category ?? 'milestone',
    phase: body.phase ?? access.project.currentPhase ?? 'acquisition',
    isHardDate: Boolean(body.isHardDate),
    ...(body.notes ? { notes: body.notes } : {}),
    vendorVisible: Boolean(body.vendorVisible),
    source: 'manual',
    createdAt: new Date().toISOString(),
  };

  const updatedEvents = [...(access.project.scheduleEvents ?? []), newEvent];
  const updated = await updateProjectInStore(projectId, { scheduleEvents: updatedEvents });
  const actor = resolveActorIdentity(access);
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: actor.name,
    kind: 'schedule.event_created',
    summary: `Scheduled "${newEvent.title}" on ${newEvent.date}`,
    targetId: newEvent.id,
    vendorVisible: Boolean(newEvent.vendorVisible),
  });
  return NextResponse.json(
    { success: true, event: newEvent, events: buildProjectSchedule(updated ?? { ...access.project, scheduleEvents: updatedEvents }) },
    { status: 201 },
  );
}
