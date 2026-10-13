import { NextResponse } from 'next/server';
import { cardTableActionSchema } from '@paperworking/validation';
import { updateProjectInStore } from '@/lib/projects/project-store';
import {
  filterCardColumnsForGuest,
  guestForbidden,
  newProjectItemId,
  parseProjectBody,
  projectApiError,
  resolveActorIdentity,
  resolveProjectAccess,
} from '@/lib/projects/project-access';
import { recordProjectActivity } from '@/lib/projects/activity';
import type { ProjectCardColumn, ProjectKanbanCard } from '@/lib/projects/types';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;

  const columns = access.project.cardColumns ?? [];
  return NextResponse.json({
    cardColumns: access.kind === 'guest' ? filterCardColumnsForGuest(columns) : columns,
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

  const parsed = await parseProjectBody(request, cardTableActionSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const columns: ProjectCardColumn[] = structuredClone(access.project.cardColumns ?? []);
  const actor = resolveActorIdentity(access);
  const persist = async (activity: { kind: string; summary: string; targetId: string; vendorVisible: boolean }) => {
    await updateProjectInStore(projectId, { cardColumns: columns });
    await recordProjectActivity(projectId, { actorUid: access.uid, actorName: actor.name, ...activity });
  };

  switch (body.action) {
    case 'add_card': {
      const col = columns.find((c) => c.id === body.columnId);
      if (!col) return projectApiError(404, 'Column not found', 'NOT_FOUND');
      const newCard: ProjectKanbanCard = {
        id: newProjectItemId('crd'),
        title: body.title,
        ...(body.description ? { description: body.description } : {}),
        columnId: col.id,
        priority: body.priority ?? 'medium',
        ...(body.dueDate ? { dueDate: body.dueDate } : {}),
        vendorVisible: Boolean(body.vendorVisible),
      };
      col.cards.push(newCard);
      await persist({
        kind: 'card.created',
        summary: `Added card "${newCard.title}" to ${col.title}`,
        targetId: newCard.id,
        vendorVisible: newCard.vendorVisible,
      });
      return NextResponse.json({ success: true, cardColumns: columns, card: newCard }, { status: 201 });
    }

    case 'move_card': {
      const targetCol = columns.find((c) => c.id === body.targetColumnId);
      if (!targetCol) return projectApiError(404, 'Target column not found', 'NOT_FOUND');
      let foundCard: ProjectKanbanCard | undefined;
      for (const col of columns) {
        const idx = col.cards.findIndex((c) => c.id === body.cardId);
        if (idx !== -1) {
          foundCard = col.cards.splice(idx, 1)[0];
          break;
        }
      }
      if (!foundCard) return projectApiError(404, 'Card not found', 'NOT_FOUND');
      foundCard.columnId = targetCol.id;
      targetCol.cards.push(foundCard);
      await persist({
        kind: 'card.moved',
        summary: `Moved "${foundCard.title}" to ${targetCol.title}`,
        targetId: foundCard.id,
        vendorVisible: Boolean(foundCard.vendorVisible),
      });
      return NextResponse.json({ success: true, cardColumns: columns });
    }

    case 'add_column': {
      const newCol: ProjectCardColumn = { id: newProjectItemId('col'), title: body.title, cards: [] };
      columns.push(newCol);
      await persist({
        kind: 'card.column_created',
        summary: `Added column "${newCol.title}"`,
        targetId: newCol.id,
        vendorVisible: false,
      });
      return NextResponse.json({ success: true, cardColumns: columns, column: newCol }, { status: 201 });
    }
  }
}
