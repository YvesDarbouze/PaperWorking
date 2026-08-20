import { handleReportsPeriodGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { seedReportTransactions } from '@/lib/reports/adapters';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ period: string }> },
) {
  const { period } = await context.params;
  const url = new URL(request.url);
  const auth = await requireDevSessionAuth();
  const projectId = url.searchParams.get('projectId');

  const result = await handleReportsPeriodGet(
    period,
    {
      organizationId: url.searchParams.get('organizationId') ?? 'org-1',
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
    },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      verifyOrgAccess: async () => true,
      loadTransactions: async ({ organizationId }) =>
        seedReportTransactions({ organizationId, projectId: projectId ?? undefined }),
    },
  );

  return toNextResponse(result);
}
