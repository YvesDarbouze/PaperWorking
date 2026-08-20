import { handleInsightsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { seedProjectsForInsights } from '@/lib/insights/adapters';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') ?? url.searchParams.get('uid') ?? 'dev-user-1';

  const result = await handleInsightsGet(
    { userId },
    {
      loadProjects: async (_userId) => ({
        projects: seedProjectsForInsights(),
        persona: 'general',
      }),
    },
  );

  return toNextResponse(result);
}
