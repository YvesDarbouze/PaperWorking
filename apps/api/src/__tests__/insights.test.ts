import { describe, expect, it } from '@jest/globals';
import { handleInsightsGet } from '../routes/insights/handler.js';
import { calculateKPIs } from '../lib/insights/kpi-engine.js';
import seedData from '../__fixtures__/agent-crew-seed.json';

describe('GET /api/insights', () => {
  const marcusProjects =
    seedData.agents.find((a: { persona: string }) => a.persona === 'wholesaler')?.projects ?? [];

  it('returns KPI payload for wholesaler projects', async () => {
    const result = await handleInsightsGet(
      { userId: 'marcus_uid' },
      {
        loadProjects: async () => ({ projects: marcusProjects, persona: 'wholesaler' }),
        calculate: calculateKPIs,
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      persona: string;
      totalProjects: number;
      metrics: unknown[];
    };
    expect(body.success).toBe(true);
    expect(body.persona).toBe('wholesaler');
    expect(body.totalProjects).toBe(3);
    expect(body.metrics.length).toBeGreaterThan(0);
  });

  it('returns general persona for empty portfolio', async () => {
    const result = await handleInsightsGet({ userId: 'unknown' });

    expect(result.status).toBe(200);
    const body = result.body as { totalProjects: number; persona: string };
    expect(body.totalProjects).toBe(0);
    expect(body.persona).toBe('general');
  });
});
