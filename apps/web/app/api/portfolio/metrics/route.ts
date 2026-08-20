import { handlePortfolioMetricsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { listSeedProjectSummaries } from '@/lib/projects/seed-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? undefined;

  const result = await handlePortfolioMetricsGet(
    { period },
    {
      projects: listSeedProjectSummaries().map((project) => ({
        id: project.id,
        name: project.propertyName,
      })),
    },
  );

  return toNextResponse(result);
}
