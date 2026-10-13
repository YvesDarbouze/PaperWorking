import { NextResponse } from 'next/server';
import { messageTopicCreateSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  filterTopicsForGuest,
  guestForbidden,
  newProjectItemId,
  parseProjectBody,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectMessageTopic } from '@/lib/projects/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;

  const topics = access.project.messageTopics ?? [];
  return NextResponse.json({
    topics: access.kind === 'guest' ? filterTopicsForGuest(topics) : topics,
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

  const parsed = await parseProjectBody(request, messageTopicCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const { project } = access;
  const now = new Date().toISOString();
  const newTopic: ProjectMessageTopic = {
    id: newProjectItemId('msg'),
    title: body.title,
    category: body.category ?? 'general',
    content: body.content,
    author: resolveActorIdentity(access),
    phase: body.phase ?? project.currentPhase ?? 'acquisition',
    createdAt: now,
    updatedAt: now,
    vendorVisible: Boolean(body.vendorVisible),
    comments: [],
  };

  const updatedTopics = [newTopic, ...(project.messageTopics ?? [])];
  await updateProjectInStore(projectId, { messageTopics: updatedTopics });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: newTopic.author.name,
    kind: 'message.created',
    summary: `Posted "${newTopic.title}" to the Message Board`,
    targetId: newTopic.id,
    vendorVisible: newTopic.vendorVisible,
  });
  return NextResponse.json({ success: true, topic: newTopic, topics: updatedTopics }, { status: 201 });
}
