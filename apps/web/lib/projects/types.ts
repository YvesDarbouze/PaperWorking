export type LegacyProjectPhase = 'acquisition' | 'purchase' | 'hold' | 'exit';

export type ProjectDisposition = 'SALE' | 'RENT' | 'MIXED';

export interface ProjectTodo {
  id: string;
  type: 'file' | 'question' | 'task';
  content: string;
  status: 'pending' | 'completed';
  phase: LegacyProjectPhase;
  action_label?: string;
}

export interface ProjectDocument {
  doc_id: string;
  type: string;
  name: string;
  url: string;
  generated_at: string;
}

export interface ProjectSummary {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  currentPhase: LegacyProjectPhase;
  status: string;
  dispositionType: ProjectDisposition;
  purchasePrice: number;
  estimatedIrr?: number;
}

export interface ProjectWorkspace extends ProjectSummary {
  project_id: string;
  property_address: string;
  phase: LegacyProjectPhase;
  phase_completion_pct: number;
  purchase_price: number;
  rehab_costs: number;
  exit_strategy: string;
  entity_type: string;
  storage_used_bytes: number;
  storageQuotaBytes: number;
  todos: ProjectTodo[];
  documents: ProjectDocument[];
}

export const PROJECT_SUBROUTES = [
  { slug: '', label: 'Overview' },
  { slug: 'insights', label: 'Insights' },
  { slug: 'documents', label: 'Documents' },
  { slug: 'reports', label: 'Reports' },
  { slug: 'scorecard', label: 'Scorecard' },
] as const;

export type ProjectSubrouteSlug = (typeof PROJECT_SUBROUTES)[number]['slug'];
