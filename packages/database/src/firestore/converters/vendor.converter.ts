import { optionalString, toDate } from './timestamp.js';

/** Matches @paperworking/services VendorRow / VendorPortalVendorRow. */
export type VendorRecord = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  contactEmail: string | null;
  contactPhone: string | null;
  vendorUid: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function vendorFromFirestore(documentId: string, data: Record<string, unknown>): VendorRecord {
  return {
    id: optionalString(data.id) ?? documentId,
    organizationId: optionalString(data.organizationId) ?? '',
    name: optionalString(data.name) ?? '',
    type: optionalString(data.type) ?? 'general',
    contactEmail: optionalString(data.contactEmail),
    contactPhone: optionalString(data.contactPhone),
    vendorUid: optionalString(data.vendorUid),
    createdAt: toDate(data.createdAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt ?? data.createdAt, 'updatedAt'),
  };
}

/** Maps Firestore vendorRequests subcollection doc to VendorBidRow contract. */
export function vendorBidFromRequest(
  documentId: string,
  data: Record<string, unknown>,
  vendorId: string,
): {
  id: string;
  vendorId: string;
  milestoneId: string;
  bidAmount: bigint;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
} {
  const quotedFee =
    typeof data.quotedFee === 'number' && Number.isFinite(data.quotedFee) ? data.quotedFee : 0;
  return {
    id: optionalString(data.id) ?? documentId,
    vendorId,
    milestoneId: optionalString(data.projectId) ?? '',
    projectId: optionalString(data.projectId) ?? '',
    bidAmount: BigInt(Math.round(quotedFee * 100)),
    status: optionalString(data.status) ?? 'PENDING',
    notes:
      optionalString(data.notes) ??
      optionalString(data.message) ??
      optionalString(data.responseMessage),
    createdAt: toDate(data.createdAt ?? data.requestedAt, 'createdAt'),
    updatedAt: toDate(data.updatedAt ?? data.createdAt ?? data.requestedAt, 'updatedAt'),
  };
}
