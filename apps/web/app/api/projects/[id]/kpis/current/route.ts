import { handleProjectKpisCurrentGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { recalculateSeedProjectKpis } from '@/lib/insights/adapters';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevSessionAuth();

  const result = await handleProjectKpisCurrentGet(id, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    recalculateKpis: recalculateSeedProjectKpis,
    loadRecentTransactions: async (projectId) => [
      {
        id: `${projectId}-tx-1`,
        payee: 'Property Manager',
        category: 'MANAGEMENT',
        amount: 240,
        transactionDate: '2026-08-01',
      },
      {
        id: `${projectId}-tx-2`,
        payee: 'Tenant — Unit A',
        category: 'RENT_INCOME',
        amount: 3200,
        transactionDate: '2026-08-05',
      },
    ],
  });

  return toNextResponse(result);
}
