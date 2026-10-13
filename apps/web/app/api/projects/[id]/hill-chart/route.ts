import { NextResponse } from 'next/server';
import { hillChartActionSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  newProjectItemId,
  parseProjectBody,
  projectApiError,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectHillChartItem } from '@/lib/projects/types';

const clampPosition = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  return NextResponse.json({ hillChartItems: access.project.hillChartItems ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, hillChartActionSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const items: ProjectHillChartItem[] = structuredClone(access.project.hillChartItems ?? []);
  const actor = resolveActorIdentity(access);
  const now = new Date().toISOString();

  if (body.action === 'update_position') {
    const target = items.find((i) => i.id === body.itemId);
    if (!target) return projectApiError(404, 'Hill chart item not found', 'NOT_FOUND');
    target.position = clampPosition(body.position);
    if (body.statusNotes !== undefined) target.statusNotes = body.statusNotes;
    target.updatedAt = now;

    await updateProjectInStore(projectId, { hillChartItems: items });
    await recordProjectActivity(projectId, {
      actorUid: access.uid,
      actorName: actor.name,
      kind: 'hill.updated',
      summary: `Moved "${target.scopeName}" to ${target.position}% on the Hill Chart`,
      targetId: target.id,
      vendorVisible: false,
    });
    return NextResponse.json({ success: true, hillChartItems: items, item: target });
  }

  const newItem: ProjectHillChartItem = {
    id: newProjectItemId('hill'),
    scopeName: body.scopeName,
    position: body.position === undefined ? 25 : clampPosition(body.position),
    phase: body.phase ?? access.project.currentPhase ?? 'acquisition',
    ...(body.statusNotes ? { statusNotes: body.statusNotes } : {}),
    updatedAt: now,
  };
  items.push(newItem);
  await updateProjectInStore(projectId, { hillChartItems: items });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: actor.name,
    kind: 'hill.item_created',
    summary: `Added "${newItem.scopeName}" to the Hill Chart`,
    targetId: newItem.id,
    vendorVisible: false,
  });
  return NextResponse.json({ success: true, hillChartItems: items, item: newItem }, { status: 201 });
}
