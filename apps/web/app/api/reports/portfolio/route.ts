import { handleReportsPortfolioGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? undefined;
  const auth = await requireDevSessionAuth();

  const result = await handleReportsPortfolioGet(
    { period: period as 'monthly' | 'quarterly' | 'yearly' | 'overall' | undefined },
    {
      authenticate: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
    },
  );

  return toNextResponse(result);
}
