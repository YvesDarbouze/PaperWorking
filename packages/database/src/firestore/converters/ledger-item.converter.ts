import { optionalDate, optionalNumber, optionalString } from './timestamp.js';

export type LedgerItemReadModel = {
  id: string;
  projectId: string;
  organizationId: string;
  payee: string | null;
  merchantName: string | null;
  category: string;
  reiCategory: string | null;
  amountCents: number;
  transactionDate: Date;
  reviewedByUser: boolean;
  userId: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

export function ledgerItemFromFirestore(
  documentId: string,
  data: Record<string, unknown>,
): LedgerItemReadModel {
  const amountCents =
    optionalNumber(data.amountCents) ??
    (optionalNumber(data.amount) != null ? Math.round(optionalNumber(data.amount)! * 100) : 0);

  const payee =
    optionalString(data.payee) ??
    optionalString(data.merchantName) ??
    optionalString(data.description) ??
    null;

  const categoryRaw = data.category;
  const category =
    optionalString(data.reiCategory) ??
    (Array.isArray(categoryRaw) && categoryRaw.length > 0
      ? String(categoryRaw[0])
      : optionalString(categoryRaw)) ??
    'UNCATEGORIZED';

  const reviewedByUser =
    data.reviewedByUser === true ||
    data.status === 'MANUALLY_APPROVED' ||
    data.status === 'AUTO_APPROVED';

  return {
    id: optionalString(data.id) ?? documentId,
    projectId: optionalString(data.projectId) ?? '',
    organizationId: optionalString(data.organizationId) ?? '',
    payee,
    merchantName: optionalString(data.merchantName) ?? payee,
    category,
    reiCategory: optionalString(data.reiCategory),
    amountCents,
    transactionDate:
      optionalDate(data.transactionDate) ??
      optionalDate(data.date) ??
      optionalDate(data.createdAt) ??
      new Date(0),
    reviewedByUser,
    userId: optionalString(data.userId) ?? optionalString(data.createdByUid) ?? '',
    source: optionalString(data.source) ?? 'MANUAL',
    createdAt: optionalDate(data.createdAt) ?? new Date(0),
    updatedAt: optionalDate(data.updatedAt) ?? new Date(0),
  };
}

export function ledgerItemToRecentTransactionRow(model: LedgerItemReadModel) {
  return {
    id: model.id,
    payee: model.payee,
    category: model.reiCategory ?? model.category,
    amount: model.amountCents / 100,
    transactionDate: model.transactionDate.toISOString(),
  };
}
