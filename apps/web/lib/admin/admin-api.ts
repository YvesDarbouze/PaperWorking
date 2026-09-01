import { bffFetch, bffJson } from '@/lib/api/bff-fetch';

export function getAdminOpsFromBff<T = Record<string, unknown>>(section: string): Promise<T> {
  const qs = new URLSearchParams({ section });
  return bffJson<T>(`/api/admin/ops?${qs.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
  });
}

export function getAdminRentcastUsageFromBff() {
  return bffJson<{ count?: number; limit?: number; success?: boolean }>('/api/admin/rentcast-usage', {
    credentials: 'include',
    cache: 'no-store',
  });
}

export function getAdminAgentCrewFromBff() {
  return bffJson<{ count?: number; agents?: unknown[]; success?: boolean }>('/api/admin/agent-crew', {
    credentials: 'include',
    cache: 'no-store',
  });
}

export function getAdminAgentCrewDetailFromBff(agentId: string) {
  return bffJson<{ agent?: Record<string, unknown>; success?: boolean; error?: string }>(
    `/api/admin/agent-crew/${encodeURIComponent(agentId)}`,
    { credentials: 'include', cache: 'no-store' },
  );
}

export function deleteAdminAgentFromBff(agentId: string) {
  return bffFetch(`/api/admin/agent-crew/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

export function getAdminLenderRatesFromBff() {
  return bffJson<{ rates?: unknown[] }>('/api/admin/lender-rates', {
    credentials: 'include',
    cache: 'no-store',
  });
}

export function getAdminLenderChecklistsFromBff() {
  return bffJson<{ checklists?: Record<string, unknown> }>('/api/admin/lender-checklists', {
    credentials: 'include',
    cache: 'no-store',
  });
}

/** Privileged identity operation — intentionally retained on legacy Nest transport (Phase B18). */
export { apiFetch as impersonateAgentViaLegacyNest } from '@/lib/api/client';
