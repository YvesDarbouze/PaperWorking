/**
 * Sprint 2 P1 — ProjectReports authorization + FE path contract (pure logic).
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

function assertProjectAccess(
  user: { uid: string; isAdmin?: boolean } | null,
  project: Project | undefined,
  orgMemberships: Map<string, string[]>,
): Project {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  if (!project) throw new ForbiddenException({ error: 'Not found' });
  if (user.isAdmin) return project;
  if (project.userId === user.uid || project.investorId === user.uid) return project;
  if (project.organizationId) {
    const orgs = orgMemberships.get(user.uid) || [];
    if (orgs.includes(project.organizationId)) return project;
  }
  throw new ForbiddenException({ error: 'Forbidden', reason: 'project' });
}

function byPeriod(
  user: { uid: string; isAdmin?: boolean } | null,
  period: string,
  projects: Project[],
  orgMemberships: Map<string, string[]>,
  opts?: { organizationId?: string; projectId?: string },
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  // Never trust client organizationId
  void opts?.organizationId;

  let scoped: Project[];
  if (opts?.projectId) {
    const project = projects.find((p) => p.id === opts.projectId);
    assertProjectAccess(user, project, orgMemberships);
    scoped = project ? [project] : [];
  } else {
    scoped = projects.filter((p) => p.userId === user.uid || p.investorId === user.uid);
  }

  return {
    success: true,
    period,
    totals: { projects: scoped.length },
    // Production FE must use Nest base URL via apiFetch, not relative /api
    apiPath: `/api/reports/${period}${opts?.projectId ? `?projectId=${opts.projectId}` : ''}`,
  };
}

function productionFrontendApiUrl(apiBase: string | undefined, path: string): string {
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is required in production');
  return `${apiBase.replace(/\/$/, '')}${path}`;
}

describe('Sprint 2 P1 — project reports', () => {
  const projects: Project[] = [
    { id: 'proj-a', userId: 'user-a', organizationId: 'org-a', purchasePrice: 100 },
    { id: 'proj-b', userId: 'user-b', organizationId: 'org-b', purchasePrice: 200 },
  ];
  const memberships = new Map<string, string[]>([
    ['user-a', ['org-a']],
    ['user-b', ['org-b']],
  ]);

  it('authorized project report → success', () => {
    const r = byPeriod({ uid: 'user-a' }, 'monthly', projects, memberships, {
      projectId: 'proj-a',
    });
    expect(r.success).toBe(true);
    expect(r.totals.projects).toBe(1);
    expect(r.apiPath).not.toContain('org-1');
  });

  it('foreign project → rejected', () => {
    expect(() =>
      byPeriod({ uid: 'user-a' }, 'monthly', projects, memberships, { projectId: 'proj-b' }),
    ).toThrow(ForbiddenException);
  });

  it('foreign organization spoof does not unlock project', () => {
    expect(() =>
      byPeriod({ uid: 'user-a' }, 'monthly', projects, memberships, {
        projectId: 'proj-b',
        organizationId: 'org-b',
      }),
    ).toThrow(ForbiddenException);
  });

  it('unauthenticated → rejected', () => {
    expect(() =>
      byPeriod(null, 'monthly', projects, memberships, { projectId: 'proj-a' }),
    ).toThrow(ForbiddenException);
  });

  it('production frontend API path requires Nest base URL', () => {
    expect(() => productionFrontendApiUrl(undefined, '/api/reports/monthly')).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
    expect(productionFrontendApiUrl('https://api.example.com', '/api/reports/monthly')).toBe(
      'https://api.example.com/api/reports/monthly',
    );
  });
});
