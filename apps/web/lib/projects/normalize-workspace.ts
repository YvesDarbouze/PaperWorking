import type { LegacyProjectPhase, ProjectDisposition, ProjectWorkspace } from '@/lib/projects/types';

function asLegacyPhase(value: unknown): LegacyProjectPhase {
  const phase = String(value ?? 'acquisition').toLowerCase();
  if (phase === 'purchase' || phase === 'fund') return 'purchase';
  if (phase === 'hold') return 'hold';
  if (phase === 'exit') return 'exit';
  return 'acquisition';
}

function asDisposition(value: unknown): ProjectDisposition {
  const d = String(value ?? 'MIXED').toUpperCase();
  if (d === 'SALE' || d === 'RENT' || d === 'MIXED') return d;
  return 'MIXED';
}

/** Map BFF/Nest serialized project rows into the workspace shape expected by UI. */
export function normalizeProjectWorkspace(raw: Record<string, unknown>): ProjectWorkspace {
  const id = String(raw.id ?? '');
  const currentPhase = asLegacyPhase(raw.currentPhase ?? raw.phase);
  const propertyName = String(raw.propertyName ?? raw.name ?? raw.title ?? 'Untitled Project');
  const address = String(raw.address ?? raw.property_address ?? '');

  return {
    id,
    propertyName,
    address,
    city: String(raw.city ?? ''),
    currentPhase,
    status: String(raw.status ?? 'Active'),
    dispositionType: asDisposition(raw.dispositionType),
    purchasePrice: Number(raw.purchasePrice ?? raw.purchase_price ?? 0),
    estimatedIrr: typeof raw.estimatedIrr === 'number' ? raw.estimatedIrr : undefined,
    phaseCompletionPct:
      typeof raw.phaseCompletionPct === 'number'
        ? raw.phaseCompletionPct
        : typeof raw.phase_completion_pct === 'number'
          ? raw.phase_completion_pct
          : undefined,
    ownershipPercentage:
      typeof raw.ownershipPercentage === 'number' ? raw.ownershipPercentage : undefined,
    estimatedExitValue:
      typeof raw.estimatedExitValue === 'number' ? raw.estimatedExitValue : undefined,
    dealId: raw.dealId != null && raw.dealId !== '' ? String(raw.dealId) : null,
    dealSlug: raw.dealSlug != null && raw.dealSlug !== '' ? String(raw.dealSlug) : null,
    dealAddress: raw.dealAddress != null && raw.dealAddress !== '' ? String(raw.dealAddress) : null,
    project_id: String(raw.project_id ?? id),
    property_address: String(raw.property_address ?? address),
    phase: currentPhase,
    phase_completion_pct: Number(raw.phase_completion_pct ?? raw.phaseCompletionPct ?? 0),
    purchase_price: Number(raw.purchase_price ?? raw.purchasePrice ?? 0),
    rehab_costs: Number(raw.rehab_costs ?? raw.rehabCost ?? raw.rehab_cost ?? 0),
    exit_strategy: String(raw.exit_strategy ?? raw.exitStrategy ?? '—'),
    entity_type: String(raw.entity_type ?? raw.entityType ?? '—'),
    storage_used_bytes: Number(raw.storage_used_bytes ?? 0),
    storageQuotaBytes: Number(raw.storageQuotaBytes ?? 1024 * 1024 * 1024),
    todos: Array.isArray(raw.todos) ? (raw.todos as ProjectWorkspace['todos']) : [],
    documents: Array.isArray(raw.documents) ? (raw.documents as ProjectWorkspace['documents']) : [],
  };
}
