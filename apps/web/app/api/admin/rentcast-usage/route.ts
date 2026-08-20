import { handleAdminRentcastUsageGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import { SEED_RENTCAST_USAGE } from '@/lib/admin/seed-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await requireDevAdminAuth();
  const year = url.searchParams.get('year');
  const month = url.searchParams.get('month');

  const result = await handleAdminRentcastUsageGet(
    {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    },
    {
      requireAdmin: async () => {
        if (isDevAdminAuthFailure(auth)) return auth;
        return auth;
      },
      countCalls: async () => SEED_RENTCAST_USAGE.count,
      limit: SEED_RENTCAST_USAGE.limit,
      now: () => new Date('2026-08-15T00:00:00.000Z'),
    },
  );

  return toNextResponse(result);
}
