export interface LenderChecklistDefinitions {
  Conventional: string[];
  'SBA 504': string[];
  'Hard Money': string[];
  Bridge: string[];
}

export const DEFAULT_CHECKLIST_DEFINITIONS: LenderChecklistDefinitions = {
  Conventional: [
    '3yr Personal Tax Returns',
    '3yr Business Tax Returns',
    'P&L Statement (Year-to-Date)',
    'Proforma (Financial Projections)',
    'Debt Schedule',
    'Organizational Documents (LLC/Articles)',
    'Project Cost Breakdown',
  ],
  'SBA 504': [
    '3yr Personal Tax Returns',
    '3yr Business Tax Returns',
    'P&L Statement (Year-to-Date)',
    'Proforma (Financial Projections)',
    'Debt Schedule',
    'Organizational Documents (LLC/Articles)',
    'Project Cost Breakdown (SBA 504)',
  ],
  'Hard Money': [
    'Purchase Contract',
    'Renovation Budget (Rehab Schedule)',
    'Proforma / Rent Roll',
    'Organizational Documents (LLC/Articles)',
  ],
  Bridge: [
    'Purchase Contract',
    'Renovation Budget (Rehab Schedule)',
    'Proforma / Rent Roll',
    'Organizational Documents (LLC/Articles)',
  ],
};

export function parseChecklistsDoc(data: Record<string, any>): LenderChecklistDefinitions {
  return {
    Conventional: Array.isArray(data.Conventional) ? data.Conventional.map(String) : DEFAULT_CHECKLIST_DEFINITIONS.Conventional,
    'SBA 504': Array.isArray(data['SBA 504']) ? data['SBA 504'].map(String) : DEFAULT_CHECKLIST_DEFINITIONS['SBA 504'],
    'Hard Money': Array.isArray(data['Hard Money']) ? data['Hard Money'].map(String) : DEFAULT_CHECKLIST_DEFINITIONS['Hard Money'],
    Bridge: Array.isArray(data.Bridge) ? data.Bridge.map(String) : DEFAULT_CHECKLIST_DEFINITIONS.Bridge,
  };
}
