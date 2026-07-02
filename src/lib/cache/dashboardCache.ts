/**
 * Lightweight server-side in-memory cache for organization dashboards.
 * Expiry is set to 60 seconds. Can be cleared on project mutations.
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const CACHE_TTL_MS = 60000; // 60 seconds
const dashboardCacheMap = new Map<string, CacheEntry>();

export function getDashboardCache(orgId: string): any | null {
  const entry = dashboardCacheMap.get(orgId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    dashboardCacheMap.delete(orgId);
    return null;
  }

  return entry.data;
}

export function setDashboardCache(orgId: string, data: any): void {
  dashboardCacheMap.set(orgId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearDashboardCache(orgId: string): void {
  dashboardCacheMap.delete(orgId);
}
