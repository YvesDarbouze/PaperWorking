import { bffJson } from '@/lib/api/bff-fetch';

export type InsightsCategory = {
  category: string;
  metrics: Array<{
    id: string;
    name: string;
    value: string | number;
    category: string;
    trend?: 'up' | 'down' | 'flat';
    benchmark?: string;
    isWarning?: boolean;
  }>;
};

/** GET /api/insights via same-origin BFF (Phase B17). */
export async function getPortfolioInsightsFromBff(): Promise<{ categories?: InsightsCategory[] }> {
  return bffJson('/api/insights', {
    credentials: 'include',
    cache: 'no-store',
  });
}
