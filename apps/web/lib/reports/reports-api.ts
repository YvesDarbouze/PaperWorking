import { bffFetch, bffJson } from '@/lib/api/bff-fetch';

export type PortfolioReportPayload = {
  period?: string;
  overview: {
    totalActiveProjects: number;
    totalPortfolioValue: number;
    totalCashInvested: number;
    totalReturns: number;
    portfolioROIPercent: number;
    avgDaysHeld: number;
  };
  narrative?: string;
  executiveSummary?: string;
};

/** GET /api/reports/portfolio via same-origin BFF (Phase B16). */
export async function getPortfolioReportFromBff(period: string): Promise<PortfolioReportPayload> {
  return bffJson<PortfolioReportPayload>(
    `/api/reports/portfolio?period=${encodeURIComponent(period)}`,
    { credentials: 'include', cache: 'no-store' },
  );
}

/** GET /api/reports/[period] via same-origin BFF (Phase B16). */
export async function getPeriodReportFromBff(period: string, projectId: string) {
  const qs = new URLSearchParams({ projectId });
  return bffJson(`/api/reports/${encodeURIComponent(period)}?${qs.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
  });
}

/** POST /api/reports/generate via same-origin BFF (Phase B16). */
export async function generateReportExportFromBff(input: {
  type: string;
  format: 'pdf' | 'csv';
}): Promise<{ ok: boolean; blob?: Blob; error?: string }> {
  const res = await bffFetch('/api/reports/generate', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? 'Export failed' };
  }
  const blob = await res.blob();
  return { ok: true, blob };
}
