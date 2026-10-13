import { listSeedProjectSummaries } from '../../lib/projects/seed-data.js';
import { getGlobalEverythingForOrg } from '../../lib/projects/everything';
import { GET as getEverything } from '../../app/api/projects/everything/route';
import { POST as postStacks, GET as getStacks } from '../../app/api/projects/stacks/route';
import { DELETE as deleteStack } from '../../app/api/projects/stacks/[id]/route';

describe('Project stacks and lineup portfolio macro views', () => {
  it('loads projects with complete summaries for stack grouping and lineup timeline', () => {
    const projects = listSeedProjectSummaries();
    expect(projects.length).toBeGreaterThanOrEqual(3);
    for (const p of projects) {
      expect(p.id).toBeTruthy();
      expect(p.propertyName).toBeTruthy();
      expect(p.currentPhase).toBeDefined();
      expect(typeof p.phaseCompletionPct === 'number' || typeof (p as any).phase_completion_pct === 'number').toBe(true);
    }
  });

  it('calculates proper stage and completion percentages for cross-project lineup view', () => {
    const projects = listSeedProjectSummaries();
    const deal2 = projects.find((p) => p.id === 'deal-2');
    expect(deal2).toBeDefined();
    expect(deal2?.currentPhase).toBe('purchase');
  });

  it('aggregates global everything view across projects in the organization', async () => {
    const everything = await getGlobalEverythingForOrg('org-1');
    expect(everything.totalProjects).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(everything.activity)).toBe(true);
    expect(Array.isArray(everything.assignments)).toBe(true);
    expect(Array.isArray(everything.upcomingDeadlines)).toBe(true);
  });

  it('provides a functional GET /api/projects/everything route', async () => {
    process.env.TEST_AUTH_UID = 'usr-lead-1';
    const req = new Request('http://localhost/api/projects/everything');
    const res = await getEverything(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalProjects).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.activity)).toBe(true);
    expect(Array.isArray(body.assignments)).toBe(true);
    expect(Array.isArray(body.upcomingDeadlines)).toBe(true);
  });

  it('supports creating, listing, and deleting project stacks', async () => {
    process.env.TEST_AUTH_UID = 'usr-lead-1';

    // 1. Create a stack
    const createReq = new Request('http://localhost/api/projects/stacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Portfolio Stack',
        description: 'Temporary stack for verification',
        projectIds: ['deal-lifecycle'],
      }),
    });
    const createRes = await postStacks(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.stack.id).toBeTruthy();
    const stackId = createBody.stack.id;

    // 2. Verify it is returned in list
    const listRes = await getStacks(new Request('http://localhost/api/projects/stacks'));
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.stacks.some((s: { id: string }) => s.id === stackId)).toBe(true);

    // 3. Delete the stack
    const deleteRes = await deleteStack(new Request('http://localhost/x', { method: 'DELETE' }), {
      params: Promise.resolve({ id: stackId }),
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.stacks.some((s: { id: string }) => s.id === stackId)).toBe(false);
  });
});
