import { deriveAllProjectMetrics } from '@paperworking/financial-engine';
import { getSeedProjectById } from '@/lib/projects/seed-data';
import { getProjectFromStore } from '@/lib/projects/project-store';
import { buildSeedProjectMockData } from './adapters';

export async function recalculateSeedProjectKpis(
  projectId: string,
): Promise<Record<string, unknown>> {
  const storedProject = getSeedProjectById(projectId) || (await getProjectFromStore(projectId));
  const metrics = await deriveAllProjectMetrics(projectId, {
    mockData: buildSeedProjectMockData(projectId, storedProject),
  });

  return {
    snapshotAt: new Date().toISOString(),
    scorecard: metrics.scorecard,
    insights: metrics.insights,
  };
}
