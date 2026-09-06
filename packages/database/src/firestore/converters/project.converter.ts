import { FirestoreDocumentParseError } from '../errors.js';
import type { ProjectReadModel } from '../types/read-models.js';
import { optionalNumber, optionalString, toDate } from './timestamp.js';

/**
 * Approved lifecyclePhase aliases → Postgres `Project.currentPhase` (1–4).
 * V1 Nest `PHASE_MAP` uses purchase; Firestore blueprint uses Fund — both map to 2.
 */
export const LIFECYCLE_PHASE_ALIASES: Readonly<Record<string, 1 | 2 | 3 | 4>> = {
  acquisition: 1,
  purchase: 2,
  fund: 2,
  hold: 3,
  exit: 4,
};

export function lifecyclePhaseToNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : null;
  }
  const s = optionalString(value)?.toLowerCase();
  if (!s) return null;
  return LIFECYCLE_PHASE_ALIASES[s] ?? null;
}

export function projectFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): ProjectReadModel {
  try {
    const name = optionalString(data.name) ?? optionalString(data.title);
    return {
      id: optionalString(data.id) ?? documentId,
      organizationId: optionalString(data.organizationId),
      userId: optionalString(data.userId) ?? optionalString(data.ownerId),
      investorId: optionalString(data.investorId),
      name,
      title: optionalString(data.title) ?? name,
      address: optionalString(data.address) ?? optionalString(data.addressLine),
      city: optionalString(data.city),
      state: optionalString(data.state),
      zip: optionalString(data.zip),
      status: optionalString(data.status),
      currentPhase:
        optionalNumber(data.currentPhase) ??
        lifecyclePhaseToNumber(data.lifecyclePhase),
      visibility: optionalString(data.visibility),
      purchasePrice: optionalNumber(data.purchasePrice),
      dealId: optionalString(data.dealId) ?? null,
      dealSlug: optionalString(data.dealSlug) ?? optionalString(data.slug) ?? null,
      reilProjectId: optionalString(data.reilProjectId),
      createdAt: toDate(data.createdAt, 'createdAt'),
      updatedAt: toDate(data.updatedAt, 'updatedAt'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirestoreDocumentParseError('projects', documentId, message);
  }
}
