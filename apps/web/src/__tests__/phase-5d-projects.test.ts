import { WEB_APP_STATUS } from '../index.js';
import {
  getSeedProjectById,
  listSeedProjectSummaries,
  seedProjectForApiGet,
  seedProjectsForApiList,
  addSeedProject,
} from '../../lib/projects/seed-data.js';
import { PHASE_LABELS, formatCurrency } from '../../lib/projects/phase-utils.js';
import { PROJECT_SUBROUTES } from '../../lib/projects/types.js';

describe('phase 5d — web app status', () => {
  it('includes project workspace routes', () => {
    expect(WEB_APP_STATUS.routes).toContain('/projects');
    expect(WEB_APP_STATUS.routes).toContain('/dashboard/projects');
    expect(WEB_APP_STATUS.projectRoutes).toContain('/project/deal-1');
    expect(WEB_APP_STATUS.projectRoutes).toContain('/project/deal-1/insights');
  });
});

describe('phase 5d — project seed data and deal backlinks', () => {
  it('lists seed projects with deal backlinks', () => {
    const summaries = listSeedProjectSummaries();
    expect(summaries.length).toBeGreaterThanOrEqual(3);
    const elm = summaries.find((p) => p.id === 'deal-1');
    expect(elm?.dealId).toBe('deal-mp-1');
    expect(elm?.dealSlug).toBe('1247elmst');
    expect(elm?.dealAddress).toBe('1247 Elm Street, Austin, TX 78702');
  });

  it('supports unlinked projects with null dealId', () => {
    const harbor = listSeedProjectSummaries().find((p) => p.id === 'deal-2');
    expect(harbor?.dealId).toBeNull();
  });

  it('returns full workspace payload by id', () => {
    const project = getSeedProjectById('deal-1');
    expect(project?.propertyName).toBe('1247 Elm Street');
    expect(project?.todos.length).toBeGreaterThan(0);
    expect(project?.documents.length).toBeGreaterThan(0);
  });

  it('allows dynamically adding a new project with deal linking', () => {
    const created = addSeedProject({
      id: 'proj-unit-test-1',
      propertyName: 'Highland Park Flip',
      address: '400 Highland Ave, Atlanta, GA 30312',
      dealId: 'deal-mp-unit',
      dealSlug: '400highlandave',
      dealAddress: '400 Highland Ave, Atlanta, GA 30312',
    });

    expect(created.id).toBe('proj-unit-test-1');
    expect(created.dealSlug).toBe('400highlandave');

    const retrieved = getSeedProjectById('proj-unit-test-1');
    expect(retrieved?.propertyName).toBe('Highland Park Flip');
    expect(retrieved?.dealId).toBe('deal-mp-unit');
  });

  it('shapes API list/get adapters', () => {
    expect(seedProjectsForApiList()[0]?.propertyName).toBeTruthy();
    expect(seedProjectForApiGet('deal-2')?.phase).toBe('purchase');
    expect(seedProjectForApiGet('missing')).toBeNull();
  });
});

describe('phase 5d — project workspace routes', () => {
  it('defines overview and analysis subroutes', () => {
    expect(PROJECT_SUBROUTES.map((route) => route.slug)).toEqual([
      '',
      'underwriting',
      'insights',
      'documents',
      'reports',
      'scorecard',
    ]);
  });

  it('labels REIL phases for UI badges', () => {
    expect(PHASE_LABELS.purchase).toBe('Fund');
    expect(formatCurrency(485000)).toContain('$485');
  });
});
