/**
 * Sprint 2 P2 — Portfolio / Insights ACL (pure logic).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Project = {
  id: string;
  userId: string;
  investorId?: string | null;
  organizationId?: string | null;
  purchasePrice: number;
};

function accessible(
  user: { uid: string; orgIds: string[] } | null,
  projects: Project[],
  client?: { userId?: string; organizationId?: string; projectId?: string },
): Project[] {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  // Never expand ACL from client ids
  void client?.userId;
  void client?.organizationId;

  let list = projects.filter(
    (p) =>
      p.userId === user.uid ||
      p.investorId === user.uid ||
      (p.organizationId && user.orgIds.includes(p.organizationId)),
  );
  if (client?.projectId) {
    const one = list.find((p) => p.id === client.projectId);
    if (!one) throw new ForbiddenException({ error: 'Forbidden', reason: 'project' });
    return [one];
  }
  return list;
}

describe('Sprint 2 P2 — portfolio/insights ACL', () => {
  const projects: Project[] = [
    { id: 'p-a', userId: 'user-a', organizationId: 'org-a', purchasePrice: 100 },
    { id: 'p-shared', userId: 'user-b', organizationId: 'org-a', purchasePrice: 200 },
    { id: 'p-foreign', userId: 'user-c', organizationId: 'org-b', purchasePrice: 999 },
  ];

  it('authorized portfolio → own + org projects', () => {
    const list = accessible({ uid: 'user-a', orgIds: ['org-a'] }, projects);
    expect(list.map((p) => p.id).sort()).toEqual(['p-a', 'p-shared']);
  });

  it('unauthenticated → rejected', () => {
    expect(() => accessible(null, projects)).toThrow(ForbiddenException);
  });

  it('cross-user spoof userId does not expand scope', () => {
    const list = accessible(
      { uid: 'user-a', orgIds: ['org-a'] },
      projects,
      { userId: 'user-c' },
    );
    expect(list.map((p) => p.id)).not.toContain('p-foreign');
  });

  it('foreign organization spoof → no leak', () => {
    const list = accessible(
      { uid: 'user-a', orgIds: ['org-a'] },
      projects,
      { organizationId: 'org-b' },
    );
    expect(list.map((p) => p.id)).not.toContain('p-foreign');
  });

  it('foreign project detail → rejected', () => {
    expect(() =>
      accessible({ uid: 'user-a', orgIds: ['org-a'] }, projects, {
        projectId: 'p-foreign',
      }),
    ).toThrow(ForbiddenException);
  });

  it('unauthorized user with no membership sees only own', () => {
    const list = accessible({ uid: 'user-a', orgIds: [] }, projects);
    expect(list.map((p) => p.id)).toEqual(['p-a']);
  });
});
