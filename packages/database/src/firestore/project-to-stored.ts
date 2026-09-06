import type { StoredProject } from '@paperworking/authz';
import type { ProjectReadModel } from './types/read-models.js';

/** Map Firestore project read model → authz/list StoredProject shape. */
export function projectReadModelToStored(project: ProjectReadModel): StoredProject {
  const ownerId = project.userId ?? '';
  return {
    id: project.id,
    userId: ownerId,
    investorId: project.investorId ?? ownerId,
    organizationId: project.organizationId ?? null,
    name: project.name,
    title: project.title,
    address: project.address,
    city: project.city,
    state: project.state,
    zip: project.zip,
    purchasePrice: project.purchasePrice,
    status: project.status,
    currentPhase: project.currentPhase ?? 1,
    visibility: project.visibility,
    dealId: project.dealId ?? null,
    dealSlug: project.dealSlug ?? null,
  };
}
