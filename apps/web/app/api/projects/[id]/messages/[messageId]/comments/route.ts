import { NextResponse } from 'next/server';
import { messageCommentCreateSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  newProjectItemId,
  parseProjectBody,
  projectApiError,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectMessageComment } from '@/lib/projects/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id: projectId, messageId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;

  const parsed = await parseProjectBody(request, messageCommentCreateSchema);
  if (!parsed.ok) return parsed.response;

  const topics = access.project.messageTopics ?? [];
  const topicIndex = topics.findIndex((t) => t.id === messageId);
  const target = topicIndex === -1 ? undefined : topics[topicIndex];
  // Guests get the same 404 for internal topics as for missing ones, so existence is not revealed.
  if (!target || (access.kind === 'guest' && !target.vendorVisible)) {
    return projectApiError(404, 'Message topic not found', 'NOT_FOUND');
  }

  const author = resolveActorIdentity(access);
  const now = new Date().toISOString();
  const newComment: ProjectMessageComment = {
    id: newProjectItemId('cmt'),
    authorId: author.id,
    authorName: author.name,
    authorRole: author.role,
    content: parsed.data.content,
    createdAt: now,
  };

  const updatedTopic = { ...target, comments: [...(target.comments ?? []), newComment], updatedAt: now };
  const updatedTopics = [...topics];
  updatedTopics[topicIndex] = updatedTopic;

  await updateProjectInStore(projectId, { messageTopics: updatedTopics });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: author.name,
    kind: 'comment.created',
    summary: `Commented on "${target.title}"`,
    targetId: target.id,
    vendorVisible: Boolean(target.vendorVisible),
  });
  return NextResponse.json({ success: true, comment: newComment, topic: updatedTopic });
}
