/**
 * Sprint 2 P0 — Task assignment scoping unit tests.
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Task = { id: string; projectId: string; assigneeId: string; title: string };
type Project = {
  id: string;
  userId?: string;
  investorId?: string;
  organizationId?: string;
};

function canAccessProject(
  userId: string,
  project: Project,
  orgIds: string[],
  memberProjectIds: string[],
): boolean {
  return (
    project.userId === userId ||
    project.investorId === userId ||
    (!!project.organizationId && orgIds.includes(project.organizationId)) ||
    memberProjectIds.includes(project.id)
  );
}

function listTasks(
  userId: string,
  tasks: Task[],
  projects: Project[],
  orgIds: string[],
  memberProjectIds: string[],
  filterProjectId?: string,
): Task[] {
  if (filterProjectId) {
    const project = projects.find((p) => p.id === filterProjectId);
    if (!project || !canAccessProject(userId, project, orgIds, memberProjectIds)) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'project' });
    }
    return tasks.filter((t) => t.projectId === filterProjectId);
  }
  return tasks.filter((t) => {
    if (t.assigneeId === userId) return true;
    const project = projects.find((p) => p.id === t.projectId);
    if (!project) return false;
    return canAccessProject(userId, project, orgIds, memberProjectIds);
  });
}

function createTask(
  userId: string,
  body: Record<string, unknown>,
  projects: Project[],
  orgIds: string[],
  memberProjectIds: string[],
  allowedAssignees: string[],
): Task {
  const projectId = String(body.projectId || '');
  if (!projectId) throw new ForbiddenException({ error: 'projectId required' });
  const project = projects.find((p) => p.id === projectId);
  if (!project || !canAccessProject(userId, project, orgIds, memberProjectIds)) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'project' });
  }
  const assigneeId =
    typeof body.assigneeId === 'string'
      ? body.assigneeId
      : typeof body.userId === 'string'
        ? body.userId
        : userId;
  if (assigneeId !== userId && !allowedAssignees.includes(assigneeId)) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'assignee' });
  }
  // Spoof org ignored
  void body.organizationId;
  return {
    id: 't-new',
    projectId,
    assigneeId,
    title: String(body.title),
  };
}

describe('Sprint 2 P0 — task assignment IDOR', () => {
  const projects: Project[] = [
    { id: 'p-a', userId: 'user-a', organizationId: 'org-a' },
    { id: 'p-b', userId: 'user-b', organizationId: 'org-b' },
  ];
  const tasks: Task[] = [
    { id: 't1', projectId: 'p-a', assigneeId: 'user-a', title: 'A1' },
    { id: 't2', projectId: 'p-b', assigneeId: 'user-b', title: 'B1' },
    { id: 't3', projectId: 'p-a', assigneeId: 'teammate', title: 'A2' },
  ];

  it('authorized list → only permitted records', () => {
    const result = listTasks('user-a', tasks, projects, ['org-a'], [], undefined);
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't3']);
  });

  it('foreign organization list → rejected', () => {
    expect(() => listTasks('user-a', tasks, projects, ['org-a'], [], 'p-b')).toThrow(
      ForbiddenException,
    );
  });

  it('authorized assignment → success', () => {
    const task = createTask(
      'user-a',
      { title: 'New', projectId: 'p-a', assigneeId: 'teammate' },
      projects,
      ['org-a'],
      [],
      ['teammate'],
    );
    expect(task.assigneeId).toBe('teammate');
  });

  it('unauthorized assignment to foreign project → rejected', () => {
    expect(() =>
      createTask(
        'user-a',
        { title: 'Hack', projectId: 'p-b', assigneeId: 'user-a' },
        projects,
        ['org-a'],
        [],
        [],
      ),
    ).toThrow(ForbiddenException);
  });

  it('cross-org assignee → rejected', () => {
    expect(() =>
      createTask(
        'user-a',
        { title: 'Hack', projectId: 'p-a', assigneeId: 'user-b' },
        projects,
        ['org-a'],
        [],
        ['teammate'],
      ),
    ).toThrow(ForbiddenException);
  });

  it('spoofed org/user does not expand scope', () => {
    expect(() =>
      createTask(
        'user-a',
        {
          title: 'Hack',
          projectId: 'p-b',
          organizationId: 'org-b',
          userId: 'user-b',
          assigneeId: 'user-b',
        },
        projects,
        ['org-a'],
        [],
        ['user-b'],
      ),
    ).toThrow(ForbiddenException);
  });
});
