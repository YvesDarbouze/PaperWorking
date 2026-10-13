import { NextResponse } from 'next/server';
import { checkInPostSchema } from '@paperworking/validation';
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
import type { ProjectCheckInQuestion, ProjectCheckInResponse } from '@/lib/projects/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  return NextResponse.json({ checkIns: access.project.checkInQuestions ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'member');
  if (!access.ok) return access.response;
  if (access.kind === 'guest') return guestForbidden();

  const parsed = await parseProjectBody(request, checkInPostSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const checkIns = access.project.checkInQuestions ?? [];
  const author = resolveActorIdentity(access);

  if ('questionId' in body) {
    const qIndex = checkIns.findIndex((q) => q.id === body.questionId);
    const question = qIndex === -1 ? undefined : checkIns[qIndex];
    if (!question) return projectApiError(404, 'Check-in question not found', 'NOT_FOUND');

    const newResponse: ProjectCheckInResponse = {
      id: newProjectItemId('resp'),
      responderId: author.id,
      responderName: author.name,
      responderRole: author.role,
      answer: body.answer,
      submittedAt: new Date().toISOString(),
    };
    const updatedCheckIns = [...checkIns];
    updatedCheckIns[qIndex] = { ...question, responses: [newResponse, ...(question.responses ?? [])] };

    await updateProjectInStore(projectId, { checkInQuestions: updatedCheckIns });
    await recordProjectActivity(projectId, {
      actorUid: access.uid,
      actorName: author.name,
      kind: 'checkin.answered',
      summary: `Answered "${question.prompt}"`,
      targetId: question.id,
      vendorVisible: false,
    });
    return NextResponse.json({ success: true, response: newResponse, checkIns: updatedCheckIns });
  }

  const newQ: ProjectCheckInQuestion = {
    id: newProjectItemId('chk'),
    prompt: body.newPrompt,
    frequency: body.frequency ?? 'weekly',
    assignedRoles: ['General Contractor', 'Acquisitions Analyst'],
    createdAt: new Date().toISOString(),
    responses: [],
  };
  const updatedCheckIns = [...checkIns, newQ];
  await updateProjectInStore(projectId, { checkInQuestions: updatedCheckIns });
  await recordProjectActivity(projectId, {
    actorUid: access.uid,
    actorName: author.name,
    kind: 'checkin.question_created',
    summary: `Added check-in question "${newQ.prompt}"`,
    targetId: newQ.id,
    vendorVisible: false,
  });
  return NextResponse.json({ success: true, question: newQ, checkIns: updatedCheckIns }, { status: 201 });
}
