/**
 * R0 — Field History Service
 * Records edits to high-impact financial fields as an audit trail.
 * Storage: Firestore sub-collection `projects/{projectId}/fieldHistory/{autoId}`
 *
 * High-impact fields tracked by default:
 * purchasePrice, estimatedARV, loanAmount, loanInterestRate, actualSalePrice,
 * monthlyGrossRent, rehabActual, rehabBudget, estimatedCurrentValue,
 * totalCashInvested, closingCosts, sellingCosts, ownershipPercentage
 */

import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import type { FieldEditEntry } from '@/types/schema';

const TRACKED_FIELDS = new Set([
  'purchasePrice',
  'estimatedARV',
  'loanAmount',
  'loanInterestRate',
  'actualSalePrice',
  'monthlyGrossRent',
  'rehabActual',
  'rehabBudget',
  'estimatedCurrentValue',
  'totalCashInvested',
  'closingCosts',
  'sellingCosts',
  'ownershipPercentage',
]);

/**
 * Returns true if a field should be version-tracked.
 */
export function isTrackedField(field: string): boolean {
  return TRACKED_FIELDS.has(field);
}

/**
 * Records a field edit in the project's fieldHistory sub-collection.
 * Only records if the field is in the tracked set and the value actually changed.
 */
export async function recordFieldEdit(
  projectId: string,
  field: string,
  previousValue: number,
  newValue: number,
  changedByUid: string,
  reason?: string
): Promise<void> {
  if (!isTrackedField(field)) return;
  if (previousValue === newValue) return;

  const historyRef = collection(db, 'projects', projectId, 'fieldHistory');
  await addDoc(historyRef, {
    field,
    previousValue,
    newValue,
    changedAt: Timestamp.now(),
    changedByUid,
    reason: reason || null,
  });
}

/**
 * Records multiple field edits in a batch.
 * Compares old and new financials to detect changes in tracked fields.
 */
export async function recordFinancialChanges(
  projectId: string,
  oldFinancials: Record<string, any>,
  newFinancials: Record<string, any>,
  changedByUid: string,
  reason?: string
): Promise<void> {
  const historyRef = collection(db, 'projects', projectId, 'fieldHistory');

  for (const field of TRACKED_FIELDS) {
    const oldVal = oldFinancials[field];
    const newVal = newFinancials[field];

    // Only record if both are numeric and different
    if (
      typeof oldVal === 'number' &&
      typeof newVal === 'number' &&
      oldVal !== newVal
    ) {
      await addDoc(historyRef, {
        field,
        previousValue: oldVal,
        newValue: newVal,
        changedAt: Timestamp.now(),
        changedByUid,
        reason: reason || null,
      });
    }
  }
}

/**
 * Retrieves the full edit history for a project, optionally filtered by field.
 * Returns entries sorted newest-first.
 */
export async function getFieldHistory(
  projectId: string,
  field?: string
): Promise<FieldEditEntry[]> {
  const historyRef = collection(db, 'projects', projectId, 'fieldHistory');

  let q;
  if (field) {
    q = query(
      historyRef,
      where('field', '==', field),
      orderBy('changedAt', 'desc')
    );
  } else {
    q = query(historyRef, orderBy('changedAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      field: data.field,
      previousValue: data.previousValue,
      newValue: data.newValue,
      changedAt: data.changedAt?.toDate?.() ?? new Date(data.changedAt),
      changedByUid: data.changedByUid,
      reason: data.reason || undefined,
    };
  });
}
