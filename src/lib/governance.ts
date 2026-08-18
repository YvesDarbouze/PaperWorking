export interface GovernanceLog {
  id: string;
  project_id: string;
  user_id: string;
  timestamp: string;
  action: string;
  reason: string;
  old_value: any;
  new_value: any;
}

const governanceMemoryStore: Record<string, GovernanceLog[]> = {};

export function logGovernanceOverride(entry: Omit<GovernanceLog, 'id' | 'timestamp'>): GovernanceLog {
  const logItem: GovernanceLog = {
    ...entry,
    id: `gov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (!governanceMemoryStore[entry.project_id]) {
    governanceMemoryStore[entry.project_id] = [];
  }

  governanceMemoryStore[entry.project_id].unshift(logItem);
  return logItem;
}

export function getGovernanceLogs(projectId: string): GovernanceLog[] {
  return governanceMemoryStore[projectId] || [];
}
