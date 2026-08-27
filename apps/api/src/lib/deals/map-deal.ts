import type { ApiDealPayload, RawDealRecord } from './types.js';

export function mapRawDealToPayload(d: RawDealRecord): ApiDealPayload {
  const project = d.projects?.[0];
  const committedAmount = (d.commitments ?? []).reduce(
    (sum, c) => sum + Number(c.amount ?? 0),
    0,
  );
  const investorCount = new Set((d.commitments ?? []).map((c) => c.investorId)).size;
  const invitedUsers = (d.invitations ?? [])
    .map((inv) => inv.inviteeUserId ?? inv.inviteeEmail)
    .filter((u): u is string => Boolean(u));

  const addrParts = (d.address ?? '').split(',').map((s) => s.trim());
  const city = project?.city || (addrParts.length >= 2 ? addrParts[1] : '') || '';
  let state = project?.state || '';
  let zipCode = project?.zip || '';

  if (addrParts.length >= 3) {
    const stateZip = addrParts[2].split(' ').filter(Boolean);
    if (!state) state = stateZip[0] || '';
    if (!zipCode) zipCode = stateZip[1] || '';
  }

  const purchasePrice = Number(d.purchasePrice ?? 0);
  const rehabCost = Number(d.rehabCost ?? 0);
  const arv = Number(d.arv ?? 0);
  const holdingCosts = Number(d.holdingCosts ?? 0);
  const projectedRoi = Number(d.projectedRoi ?? 0);

  return {
    id: d.id,
    slug: d.slug,
    address: d.address,
    propertyName:
      project?.name ||
      project?.title ||
      d.address.split(',')[0] ||
      'Real Estate Deal',
    city,
    state,
    zipCode,
    assetClass: project?.propertyType || 'Multi-family',
    subStrategy: project?.subStrategy || 'FLIP',
    status: String(d.status),
    visibility: (d.visibility as ApiDealPayload['visibility']) ?? 'marketplace',
    purchasePrice,
    rehabCost,
    arv,
    holdingCosts,
    projectedRoi,
    fundingTarget: purchasePrice + rehabCost,
    committedAmount,
    investorCount,
    creatorId: d.creatorId,
    invitedUsers,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    projectId: d.projectId || project?.id || null,
    projectName: project?.name || project?.title || null,
  };
}

export function mapRawDealsToPayloads(deals: RawDealRecord[]): ApiDealPayload[] {
  return deals.map(mapRawDealToPayload);
}
