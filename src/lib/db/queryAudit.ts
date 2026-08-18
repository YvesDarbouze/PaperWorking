/**
 * PaperWorking Database Performance Auditor & Composite Index Guide
 * 
 * Logs slow queries taking > 100ms and defines essential composite indexes.
 */

export const SLOW_QUERY_THRESHOLD_MS = 100;

export interface QueryLogEntry {
  query: string;
  durationMs: number;
  timestamp: string;
  isSlow: boolean;
}

/**
 * Log query execution performance and flag queries exceeding slow query threshold.
 */
export function logQueryPerformance(query: string, durationMs: number): QueryLogEntry {
  const isSlow = durationMs >= SLOW_QUERY_THRESHOLD_MS;
  const entry: QueryLogEntry = {
    query,
    durationMs,
    timestamp: new Date().toISOString(),
    isSlow,
  };

  if (isSlow) {
    console.warn(`⚠️ [SLOW QUERY AUDIT] Query exceeded ${SLOW_QUERY_THRESHOLD_MS}ms threshold (${durationMs}ms): ${query}`);
  }

  return entry;
}

/**
 * Recommended Composite Index Specifications for Scale (10,000+ Projects)
 * 
 * 1. Dashboard filtering: (userId, phase)
 * 2. Tax calculations: (projectId, year, quarter)
 * 3. Activity feed pagination: (userId, createdAt)
 */
export const COMPOSITE_INDEX_SPECIFICATIONS = [
  { table: 'Project', columns: ['userId', 'phase'], purpose: 'Dashboard phase filtering' },
  { table: 'TaxRecord', columns: ['projectId', 'year', 'quarter'], purpose: 'Quarterly tax aggregations' },
  { table: 'ActivityLog', columns: ['userId', 'createdAt'], purpose: 'Cursor-based activity feeds' },
];
