import { deriveAllProjectMetrics, canonicalSeedDeal } from '@paperworking/financial-engine';

export async function healthCheckMetricsProbe(): Promise<{ ok: boolean; noi: number | null }> {
  const result = await deriveAllProjectMetrics('health-probe', { mockData: canonicalSeedDeal });
  return { ok: result.scorecard.noi.value !== null, noi: result.scorecard.noi.value };
}
