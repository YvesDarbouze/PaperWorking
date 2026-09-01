import { describe, expect, it } from '@jest/globals';
import { canonicalSeedDeal, deriveAllProjectMetrics } from '@paperworking/financial-engine';
import {
  auditProjectKpiInputProvenance,
  createProjectKpiReadService,
  type ProjectKpiReadRepository,
} from '@paperworking/services';
import {
  scorecardEntries,
  scorecardSourceStatusCopy,
  trendStatusCopy,
} from '../../lib/insights/adapters.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B9.1 — KPI provenance metadata', () => {
  it('ProjectKpiReadService exposes trust metadata without changing scorecard numbers', async () => {
    const repository: ProjectKpiReadRepository = {
      findProjectKpiInputs: async () => ({
        id: 'p1',
        purchasePrice: canonicalSeedDeal.purchase_price,
        currentPhase: 2,
      }),
      listRecentApprovedTransactions: async () => [],
    };

    const baseline = await deriveAllProjectMetrics('p1', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: canonicalSeedDeal.purchase_price,
        property_value: canonicalSeedDeal.purchase_price,
      },
    });

    const service = createProjectKpiReadService({
      authz: {
        assertProjectAccess: async () => ({
          id: 'p1',
          userId: 'user-1',
          investorId: 'user-1',
        }),
      } as never,
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    const result = await service.getCurrentProjectKpis(
      { uid: 'user-1', email: 'u@example.com', accountType: 'investor', isAdmin: false },
      'p1',
    );

    expect(result.kpis.scorecard.noi.value).toBe(baseline.scorecard.noi.value);
    expect(result.kpis.scorecard.capRate.value).toBe(baseline.scorecard.capRate.value);
    expect(result.kpis.sourceStatus).toBe('partially_projected');
    expect(result.trendStatus).toBe('demo');
    expect(result.recentActivityStatus).toBe('empty');
  });

  it('scorecardEntries preserves projected flag from financial-engine', async () => {
    const metrics = await deriveAllProjectMetrics('p1', { mockData: canonicalSeedDeal });
    const entries = scorecardEntries(metrics.scorecard);
    expect(entries.every((entry) => entry.projected === true)).toBe(true);
    expect(entries[0]?.display).toBeTruthy();
  });

  it('UI copy helpers distinguish projected scorecard from demo trends', () => {
    expect(scorecardSourceStatusCopy('partially_projected')).toContain('projected rent');
    expect(trendStatusCopy('demo')).toContain('demo trend');
  });
});

describe('phase B9.1 — UI safety wiring', () => {
  it('insights panel renders demo trend badge and projected metric cards', () => {
    const insights = readFileSync(
      join(here, '../../components/insights/ProjectInsightsPanel.tsx'),
      'utf8',
    );
    const scorecard = readFileSync(
      join(here, '../../components/insights/ProjectScorecardPanel.tsx'),
      'utf8',
    );

    expect(insights).toContain('trendStatus');
    expect(insights).toContain('Demo data');
    expect(insights).toContain('projected={metric.projected}');
    expect(insights).toContain('recentActivityStatus');
    expect(scorecard).toContain('sourceStatus');
    expect(scorecard).not.toContain('authoritative values');
  });
});

describe('phase B9.1 — input audit table sanity', () => {
  it('real purchase price does not imply real rent/opex', () => {
    const summary = auditProjectKpiInputProvenance({
      id: 'p1',
      purchasePrice: 500_000,
    });
    expect(summary.inputProvenance.purchase_price).toBe('REAL_DB');
    expect(summary.inputProvenance.gross_scheduled_rent).toBe('CANONICAL_DEFAULT');
    expect(summary.inputProvenance.operating_expenses).toBe('CANONICAL_DEFAULT');
  });
});
