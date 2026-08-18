import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal';

describe('Audit Suite 9: Performance & Load Benchmarks', () => {
  test('deriveAllProjectMetrics completes in < 200ms for a complete project', async () => {
    const start = performance.now();
    await deriveAllProjectMetrics('complete-perf-project', { mockData: canonicalSeedDeal });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  test('Portfolio metric calculation across 50 projects completes in < 2s', async () => {
    const start = performance.now();
    const promises = Array.from({ length: 50 }).map((_, i) =>
      deriveAllProjectMetrics(`proj_perf_${i}`, { mockData: canonicalSeedDeal })
    );

    await Promise.all(promises);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2000);
  });
});
