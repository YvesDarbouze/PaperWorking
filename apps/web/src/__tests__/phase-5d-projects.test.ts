import { WEB_APP_STATUS } from '../index.js';
import {
  getSeedProjectById,
  listSeedProjectSummaries,
  seedProjectForApiGet,
  seedProjectsForApiList,
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

describe('phase 5d — project seed data', () => {
  it('lists three seed projects aligned with command center pipeline', () => {
    const summaries = listSeedProjectSummaries();
    expect(summaries).toHaveLength(3);
    expect(summaries.map((project) => project.id)).toEqual(['deal-1', 'deal-2', 'deal-3']);
  });

  it('returns full workspace payload by id', () => {
    const project = getSeedProjectById('deal-1');
    expect(project?.propertyName).toBe('1247 Elm Street');
    expect(project?.todos.length).toBeGreaterThan(0);
    expect(project?.documents.length).toBeGreaterThan(0);
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
