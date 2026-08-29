import type { ProjectSummary, ProjectWorkspace } from '../../apps/web/lib/projects/types';

const BASE_TODOS = {
  acquisition: [
    {
      id: 'todo-acq-1',
      type: 'file' as const,
      content: 'Upload proof of funds letter',
      status: 'completed' as const,
      phase: 'acquisition' as const,
      action_label: 'Upload letter',
    },
    {
      id: 'todo-acq-2',
      type: 'question' as const,
      content: 'Confirm maximum offer price',
      status: 'pending' as const,
      phase: 'acquisition' as const,
      action_label: 'Set offer cap',
    },
  ],
  purchase: [
    {
      id: 'todo-fund-1',
      type: 'task' as const,
      content: 'Collect lender package checklist items',
      status: 'pending' as const,
      phase: 'purchase' as const,
      action_label: 'Open checklist',
    },
  ],
  hold: [
    {
      id: 'todo-hold-1',
      type: 'task' as const,
      content: 'Update monthly operating statement',
      status: 'pending' as const,
      phase: 'hold' as const,
      action_label: 'Add statement',
    },
  ],
  exit: [
    {
      id: 'todo-exit-1',
      type: 'file' as const,
      content: 'Upload disposition settlement statement',
      status: 'pending' as const,
      phase: 'exit' as const,
      action_label: 'Upload statement',
    },
  ],
};

export const SEED_PROJECTS: ProjectWorkspace[] = [
  {
    id: 'deal-1',
    project_id: 'deal-1',
    propertyName: '1247 Elm Street',
    address: '1247 Elm Street, Austin, TX 78702',
    property_address: '1247 Elm Street, Austin, TX 78702',
    city: 'Austin, TX',
    currentPhase: 'acquisition',
    phase: 'acquisition',
    status: 'Underwriting',
    dispositionType: 'SALE',
    purchasePrice: 485000,
    purchase_price: 485000,
    rehab_costs: 62000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC (single)',
    phase_completion_pct: 42,
    estimatedIrr: 0.184,
    dealId: 'deal-mp-1',
    dealSlug: '1247elmst',
    dealAddress: '1247 Elm Street, Austin, TX 78702',
    storage_used_bytes: 1_240_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [
      {
        doc_id: 'doc-1',
        type: 'Proof of Funds',
        name: 'Bank_Statement_POF.pdf',
        url: '#',
        generated_at: '2026-08-01T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'deal-2',
    project_id: 'deal-2',
    propertyName: '88 Harbor Lane',
    address: '88 Harbor Lane, Tampa, FL 33602',
    property_address: '88 Harbor Lane, Tampa, FL 33602',
    city: 'Tampa, FL',
    currentPhase: 'purchase',
    phase: 'purchase',
    status: 'Lender review',
    dispositionType: 'SALE',
    purchasePrice: 392000,
    purchase_price: 392000,
    rehab_costs: 48000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC (single)',
    phase_completion_pct: 58,
    estimatedIrr: 0.162,
    dealId: null,
    dealSlug: null,
    dealAddress: null,
    storage_used_bytes: 2_480_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.purchase,
    documents: [
      {
        doc_id: 'doc-2',
        type: 'Loan Estimate',
        name: 'LE_Harbor_Lane.pdf',
        url: '#',
        generated_at: '2026-08-10T00:00:00.000Z',
      },
    ],
  },
  {
    id: 'deal-3',
    project_id: 'deal-3',
    propertyName: '512 Oak Ridge',
    address: '512 Oak Ridge, Denver, CO 80205',
    property_address: '512 Oak Ridge, Denver, CO 80205',
    city: 'Denver, CO',
    currentPhase: 'hold',
    phase: 'hold',
    status: 'Operating',
    dispositionType: 'RENT',
    purchasePrice: 615000,
    purchase_price: 615000,
    rehab_costs: 35000,
    exit_strategy: 'Rental',
    entity_type: 'Series LLC',
    phase_completion_pct: 71,
    estimatedIrr: 0.128,
    dealId: 'deal-mp-3',
    dealSlug: 'oakridgehold',
    dealAddress: '88 Oak Ridge Dr, Denver, CO 80202',
    storage_used_bytes: 4_120_000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.hold,
    documents: [
      {
        doc_id: 'doc-3',
        type: 'Insurance Policy',
        name: 'Oak_Ridge_Insurance.pdf',
        url: '#',
        generated_at: '2026-07-15T00:00:00.000Z',
      },
    ],
  },
];

export function addSeedProject(project: Partial<ProjectWorkspace> & { id: string; propertyName: string }): ProjectWorkspace {
  const newProject: ProjectWorkspace = {
    id: project.id,
    project_id: project.id,
    propertyName: project.propertyName,
    address: project.address || project.property_address || 'Property Address',
    property_address: project.property_address || project.address || 'Property Address',
    city: project.city || 'Austin, TX',
    currentPhase: project.currentPhase || 'acquisition',
    phase: project.phase || 'acquisition',
    status: project.status || 'Active',
    dispositionType: project.dispositionType || 'SALE',
    purchasePrice: project.purchasePrice || project.purchase_price || 450000,
    purchase_price: project.purchase_price || project.purchasePrice || 450000,
    rehab_costs: project.rehab_costs || 50000,
    exit_strategy: project.exit_strategy || 'Fix & Flip',
    entity_type: project.entity_type || 'LLC',
    phase_completion_pct: project.phase_completion_pct || 10,
    estimatedIrr: project.estimatedIrr || 0.15,
    dealId: project.dealId || null,
    dealSlug: project.dealSlug || null,
    dealAddress: project.dealAddress || project.address || null,
    storage_used_bytes: 1000,
    storageQuotaBytes: 536_870_912,
    todos: BASE_TODOS.acquisition,
    documents: [],
  };

  const existingIndex = SEED_PROJECTS.findIndex((p) => p.id === newProject.id);
  if (existingIndex >= 0) {
    SEED_PROJECTS[existingIndex] = newProject;
  } else {
    SEED_PROJECTS.unshift(newProject);
  }
  return newProject;
}

export function listSeedProjectSummaries(): ProjectSummary[] {
  return SEED_PROJECTS.map((project) => ({
    id: project.id,
    propertyName: project.propertyName,
    address: project.address,
    city: project.city,
    currentPhase: project.currentPhase,
    status: project.status,
    dispositionType: project.dispositionType,
    purchasePrice: project.purchasePrice,
    estimatedIrr: project.estimatedIrr,
    phaseCompletionPct: project.phase_completion_pct,
    ownershipPercentage: 100,
    estimatedExitValue: Math.round(project.purchasePrice * 1.22),
    dealId: project.dealId,
    dealSlug: project.dealSlug,
    dealAddress: project.dealAddress,
  }));
}

export function getSeedProjectById(projectId: string): ProjectWorkspace | null {
  return SEED_PROJECTS.find((project) => project.id === projectId) ?? null;
}

export function seedProjectsForApiList(): Array<Record<string, unknown>> {
  return SEED_PROJECTS.map((project) => ({
    id: project.id,
    propertyName: project.propertyName,
    address: project.address,
    city: project.city,
    currentPhase: project.currentPhase,
    status: project.status,
    dispositionType: project.dispositionType,
    purchasePrice: project.purchasePrice,
    estimatedIrr: project.estimatedIrr,
    phaseCompletionPct: project.phase_completion_pct,
    ownershipPercentage: 100,
    estimatedExitValue: Math.round(project.purchasePrice * 1.22),
    financials: { purchasePrice: project.purchasePrice },
    dealId: project.dealId,
    dealSlug: project.dealSlug,
    dealAddress: project.dealAddress,
  }));
}

export function seedProjectForApiGet(projectId: string): Record<string, unknown> | null {
  const project = getSeedProjectById(projectId);
  if (!project) return null;
  return { ...project, project_id: project.id };
}
