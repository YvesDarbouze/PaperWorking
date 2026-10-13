import { NextResponse } from 'next/server';
import { campfireMessageCreateSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  guestForbidden,
  newProjectItemId,
  parseProjectBody,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import { processCampfireCommand } from '@/lib/projects/campfire-commands';
import type { ProjectCampfireMessage, ProjectWorkspace } from '@/lib/projects/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  return NextResponse.json({ messages: access.project.campfireMessages ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, campfireMessageCreateSchema);
  if (!parsed.ok) return parsed.response;

  const author = resolveActorIdentity(access);
  const commandResult = processCampfireCommand(parsed.data.text, access.project, author);

  const newMessage: ProjectCampfireMessage = {
    id: newProjectItemId('cmp'),
    senderId: author.id,
    senderName: author.name,
    senderRole: author.role,
    text: commandResult.messageText,
    createdAt: new Date().toISOString(),
  };

  const updatedMessages = [...(access.project.campfireMessages ?? []), newMessage];
  const patch: Partial<ProjectWorkspace> = { campfireMessages: updatedMessages };

  if (commandResult.createdTask) {
    patch.tasks = [...(access.project.tasks ?? []), commandResult.createdTask];
  }
  if (commandResult.createdEvent) {
    patch.scheduleEvents = [...(access.project.scheduleEvents ?? []), commandResult.createdEvent];
  }

  await updateProjectInStore(projectId, patch);
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: author.name,
    kind: commandResult.createdTask ? 'todo.task_created' : 'campfire.posted',
    summary: commandResult.systemNotice || 'Posted in Campfire',
    targetId: newMessage.id,
    vendorVisible: false,
  });
  return NextResponse.json({ success: true, message: newMessage, messages: updatedMessages }, { status: 201 });
}
