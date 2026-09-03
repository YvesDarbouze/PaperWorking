import { optionalDate, optionalNumber, optionalString } from './timestamp.js';

export type DealReadModel = {
  id: string;
  slug: string;
  address: string;
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  status: string;
  visibility: string;
  creatorId: string;
  organizationId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Map a Firestore dealListings document to the shared DealRecord shape. */
export function dealFromFirestore(id: string, data: Record<string, unknown>): DealReadModel {
  const creatorId =
    optionalString(data.creatorId) ??
    optionalString(data.ownerUid) ??
    optionalString(data.ownerId) ??
    '';

  return {
    id,
    slug: optionalString(data.slug) ?? id,
    address: optionalString(data.address) ?? optionalString(data.title) ?? '',
    purchasePrice: optionalNumber(data.purchasePrice) ?? 0,
    rehabCost: optionalNumber(data.rehabCost) ?? 0,
    arv: optionalNumber(data.arv) ?? 0,
    holdingCosts: optionalNumber(data.holdingCosts) ?? 0,
    projectedRoi: optionalNumber(data.projectedRoi) ?? 0,
    status: optionalString(data.status) ?? 'draft',
    visibility: optionalString(data.visibility) ?? 'private',
    creatorId,
    organizationId: optionalString(data.organizationId) ?? '',
    projectId: optionalString(data.projectId),
    createdAt: optionalDate(data.createdAt) ?? new Date(0),
    updatedAt: optionalDate(data.updatedAt) ?? new Date(0),
  };
}

export function dealToDealRecord(model: DealReadModel) {
  return {
    id: model.id,
    slug: model.slug,
    address: model.address,
    purchasePrice: model.purchasePrice,
    rehabCost: model.rehabCost,
    arv: model.arv,
    holdingCosts: model.holdingCosts,
    projectedRoi: model.projectedRoi,
    status: model.status,
    visibility: model.visibility,
    creatorId: model.creatorId,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export function dealToExistsPreview(model: DealReadModel) {
  return {
    id: model.id,
    slug: model.slug,
    status: model.status,
    visibility: model.visibility,
    address: model.address,
  };
}
