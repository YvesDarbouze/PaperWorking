import { getKpisByPhase } from '@/lib/insights/kpi-registry';
import {
  buildGoldenProject,
  deriveMetricsForProject,
  evaluateCheckA,
  evaluateCheckB,
  evaluateCheckC,
  evaluateCheckD,
} from './harness-helpers';
import type { ProjectSummary } from '@/lib/projects/types';
import type { ProjectMetricsResult } from '@paperworking/financial-engine';

describe('Phase 2: Full Underwriting & Return Modeling — Verification Units (KPIs 9–18)', () => {
  let goldenProject: ProjectSummary;
  let baseMetrics: ProjectMetricsResult;
  const phase2Kpis = getKpisByPhase(2);

  beforeAll(async () => {
    goldenProject = buildGoldenProject();
    baseMetrics = await deriveMetricsForProject(goldenProject);
  });

  test('Phase 2 contains exactly 10 KPIs', () => {
    expect(phase2Kpis).toHaveLength(10);
  });

  describe.each(phase2Kpis.map((kpi) => [kpi.number, kpi.id, kpi.name, kpi]))(
    'KPI #%i: %s (%s)',
    (num, id, name, kpi) => {
      test('CHECK A — WIRING: responds dynamically to input perturbation', async () => {
        const res = await evaluateCheckA(kpi, goldenProject, baseMetrics);
        expect(['PASS', 'BLOCKED-MISSING-INPUT']).toContain(res.status);
        if (res.status === 'FAIL') {
          throw new Error(`Check A Failed for KPI #${num} (${name}): ${res.details}`);
        }
      });

      test('CHECK B — GOLDEN VALUE: agrees numerically with financial engine', () => {
        const res = evaluateCheckB(kpi, baseMetrics);
        expect(res.status).toBe('PASS');
        expect(res.goldenValue).not.toBeNull();
        expect(Number.isFinite(res.goldenValue)).toBe(true);
      });

      test('CHECK C — VISUALIZATION: matches registered vizType and handles empty input state', () => {
        const res = evaluateCheckC(kpi);
        expect(res.status).toBe('PASS');
      });

      test('CHECK D — EXPORT: CSV contains live computed value and RFC-4180 format', () => {
        const res = evaluateCheckD(kpi, goldenProject, baseMetrics);
        expect(res.status).toBe('PASS');
      });
    },
  );
});
