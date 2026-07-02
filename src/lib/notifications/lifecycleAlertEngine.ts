/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Lifecycle Alert Engine
 *
 * Server-side engine that evaluates project lifecycle
 * deadlines and fires proactive notifications.
 *
 * Triggers:
 *   - Lease renewal: 60 days before expiry
 *   - Property tax: based on known tax due dates
 *   - Insurance renewal: 30 days before expiry
 *   - Valuation review: 6 months since last update
 *
 * Debounce: 7 days for deadlines, 30 days for valuation.
 * Designed to be called from a cron route (daily cadence).
 * ═══════════════════════════════════════════════════════
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NotificationService } from '@/lib/services/notificationService';
import {
  type LifecycleAlertType,
  ALERT_METADATA,
  buildAlertTitle,
  buildAlertBody,
  buildAlertDeepLink,
  type AlertContentParams,
} from './notificationTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LifecycleAlertEvaluation {
  alertType: LifecycleAlertType;
  triggered: boolean;
  daysUntil: number | null;
  /** The deadline date, if known */
  deadlineDate?: Date;
}

export interface LifecycleAlertResult {
  projectId: string;
  evaluations: LifecycleAlertEvaluation[];
  alertsFired: LifecycleAlertType[];
  alertsDebounced: LifecycleAlertType[];
}

export interface LifecycleAlertBatchResult {
  projectsScanned: number;
  totalAlertsFired: number;
  totalAlertsDebounced: number;
  errors: Array<{ projectId: string; error: string }>;
  results: LifecycleAlertResult[];
}

// ── Debounce Check ────────────────────────────────────────────────────────────

const DEBOUNCE_COLLECTION = 'metricAlertDebounce'; // Shared with metric alerts

async function isDebounced(
  projectId: string,
  alertType: LifecycleAlertType
): Promise<boolean> {
  const meta = ALERT_METADATA[alertType];
  const debounceMs = meta.debounceHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - debounceMs);

  const docId = `${projectId}_${alertType}`;
  const docRef = adminDb.collection(DEBOUNCE_COLLECTION).doc(docId);
  const doc = await docRef.get();

  if (!doc.exists) return false;

  const lastFiredAt = doc.data()?.lastFiredAt;
  if (!lastFiredAt) return false;

  const lastFiredDate = lastFiredAt.toDate ? lastFiredAt.toDate() : new Date(lastFiredAt);
  return lastFiredDate > cutoff;
}

async function recordAlertFired(
  projectId: string,
  alertType: LifecycleAlertType
): Promise<void> {
  const docId = `${projectId}_${alertType}`;
  await adminDb.collection(DEBOUNCE_COLLECTION).doc(docId).set(
    {
      projectId,
      alertType,
      lastFiredAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Date Helpers ──────────────────────────────────────────────────────────────

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(date: Date): number {
  return daysBetween(date, new Date());
}

// ── Lifecycle Evaluators ──────────────────────────────────────────────────────

/**
 * Lease Renewal: 60 days before estimated lease end.
 * Uses acquisitionDate + 12 months as a naive lease end estimate for
 * Buy & Hold / Rent strategy projects, unless an explicit lease end is stored.
 */
function evaluateLeaseRenewal(
  projectData: FirebaseFirestore.DocumentData
): LifecycleAlertEvaluation {
  const strategy = projectData.strategyType;
  const isRental = strategy === 'Rent' || strategy === 'Buy & Hold';

  if (!isRental) {
    return { alertType: 'LEASE_RENEWAL_DUE', triggered: false, daysUntil: null };
  }

  const acquisitionDate = toDate(projectData.financials?.acquisitionDate);
  if (!acquisitionDate) {
    return { alertType: 'LEASE_RENEWAL_DUE', triggered: false, daysUntil: null };
  }

  // Estimate lease end as 12 months from acquisition (annual lease assumption)
  const leaseEnd = new Date(acquisitionDate);
  leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

  // If lease end is in the past, bump it forward by years until it's in the future
  const now = new Date();
  while (leaseEnd < now) {
    leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);
  }

  const daysUntil = daysBetween(now, leaseEnd);
  const threshold = 60; // days

  return {
    alertType: 'LEASE_RENEWAL_DUE',
    triggered: daysUntil <= threshold && daysUntil >= 0,
    daysUntil,
    deadlineDate: leaseEnd,
  };
}

/**
 * Property Tax: Alerts when property tax deadlines approach.
 * Uses common US semi-annual tax dates: April 10 and December 10.
 * Fires 30 days before each deadline.
 */
function evaluatePropertyTax(
  _projectData: FirebaseFirestore.DocumentData
): LifecycleAlertEvaluation {
  const now = new Date();
  const year = now.getFullYear();

  // Common US property tax due dates (varies by jurisdiction)
  const taxDates = [
    new Date(year, 3, 10),   // April 10
    new Date(year, 11, 10),  // December 10
    new Date(year + 1, 3, 10), // April 10 next year
  ];

  // Find the next upcoming tax date
  const nextDue = taxDates.find(d => d > now);
  if (!nextDue) {
    return { alertType: 'PROPERTY_TAX_DUE', triggered: false, daysUntil: null };
  }

  const daysUntil = daysBetween(now, nextDue);
  const threshold = 30; // days

  return {
    alertType: 'PROPERTY_TAX_DUE',
    triggered: daysUntil <= threshold && daysUntil >= 0,
    daysUntil,
    deadlineDate: nextDue,
  };
}

/**
 * Insurance Renewal: 30 days before annual insurance renewal.
 * Estimates renewal date as 12 months from acquisition.
 */
function evaluateInsuranceRenewal(
  projectData: FirebaseFirestore.DocumentData
): LifecycleAlertEvaluation {
  const acquisitionDate = toDate(projectData.financials?.acquisitionDate);
  if (!acquisitionDate) {
    return { alertType: 'INSURANCE_RENEWAL_DUE', triggered: false, daysUntil: null };
  }

  // Insurance policies typically renew annually from purchase
  const renewalDate = new Date(acquisitionDate);
  renewalDate.setFullYear(renewalDate.getFullYear() + 1);

  const now = new Date();
  while (renewalDate < now) {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  }

  const daysUntil = daysBetween(now, renewalDate);
  const threshold = 30; // days

  return {
    alertType: 'INSURANCE_RENEWAL_DUE',
    triggered: daysUntil <= threshold && daysUntil >= 0,
    daysUntil,
    deadlineDate: renewalDate,
  };
}

/**
 * Valuation Review: 6 months since last property value update.
 * Checks updatedAt or estimatedCurrentValue update timestamp.
 */
function evaluateValuationReview(
  projectData: FirebaseFirestore.DocumentData
): LifecycleAlertEvaluation {
  // Use project updatedAt as a proxy for when financials were last reviewed
  const lastUpdate = toDate(projectData.updatedAt);
  if (!lastUpdate) {
    return { alertType: 'VALUATION_REVIEW_DUE', triggered: false, daysUntil: null };
  }

  const daysSinceUpdate = daysSince(lastUpdate);
  const threshold = 180; // 6 months in days

  return {
    alertType: 'VALUATION_REVIEW_DUE',
    triggered: daysSinceUpdate >= threshold,
    daysUntil: daysSinceUpdate >= threshold ? 0 : threshold - daysSinceUpdate,
  };
}

// ── Main Evaluation ───────────────────────────────────────────────────────────

/**
 * Evaluates all lifecycle alerts for a single project.
 */
export async function evaluateLifecycleAlerts(
  projectId: string,
  projectData: FirebaseFirestore.DocumentData
): Promise<LifecycleAlertResult> {
  const address = projectData.address ?? projectData.propertyName ?? 'Unknown Property';
  const ownerUid = projectData.ownerUid;

  if (!ownerUid) {
    console.warn(`[LifecycleAlertEngine] Project ${projectId} has no ownerUid, skipping.`);
    return { projectId, evaluations: [], alertsFired: [], alertsDebounced: [] };
  }

  // Run all evaluations
  const evaluations: LifecycleAlertEvaluation[] = [
    evaluateLeaseRenewal(projectData),
    evaluatePropertyTax(projectData),
    evaluateInsuranceRenewal(projectData),
    evaluateValuationReview(projectData),
  ];

  const alertsFired: LifecycleAlertType[] = [];
  const alertsDebounced: LifecycleAlertType[] = [];

  for (const evaluation of evaluations) {
    if (!evaluation.triggered) continue;

    // Check debounce
    const debounced = await isDebounced(projectId, evaluation.alertType);
    if (debounced) {
      alertsDebounced.push(evaluation.alertType);
      continue;
    }

    // Build notification content
    const contentParams: AlertContentParams = {
      address,
      daysUntil: evaluation.daysUntil ?? undefined,
    };

    const title = buildAlertTitle(evaluation.alertType, contentParams);
    const body = buildAlertBody(evaluation.alertType, contentParams);
    const deepLinkUrl = buildAlertDeepLink(projectId, evaluation.alertType);
    const meta = ALERT_METADATA[evaluation.alertType];

    try {
      await NotificationService.createNotification({
        recipientId: ownerUid,
        type: meta.notificationType,
        actor: {
          uid: 'system',
          name: 'PaperWorking Lifecycle Engine',
        },
        objectReference: {
          projectId,
          dealAddress: address,
          time: evaluation.daysUntil != null
            ? `${evaluation.daysUntil} day${evaluation.daysUntil !== 1 ? 's' : ''}`
            : undefined,
          metadata: {
            alertType: evaluation.alertType,
            daysUntil: evaluation.daysUntil,
            deadlineDate: evaluation.deadlineDate?.toISOString(),
            title,
            body,
          },
        },
        deepLinkUrl,
        expiresAt: evaluation.deadlineDate,
      });

      await recordAlertFired(projectId, evaluation.alertType);
      alertsFired.push(evaluation.alertType);

      console.log(
        `[LifecycleAlertEngine] Fired ${evaluation.alertType} for ${address} (${projectId}): ` +
        `daysUntil=${evaluation.daysUntil}`
      );
    } catch (err) {
      console.error(
        `[LifecycleAlertEngine] Failed to fire ${evaluation.alertType} for ${projectId}:`,
        err
      );
    }
  }

  return { projectId, evaluations, alertsFired, alertsDebounced };
}

// ── Batch Scanner (for cron) ──────────────────────────────────────────────────

/**
 * Scans all active projects and evaluates lifecycle alerts.
 * Designed to be called daily from a cron route.
 *
 * @param organizationId Optional — scope to a single tenant
 * @param limit          Max projects to scan per run (default 200)
 */
export async function scanAllProjectsForLifecycleAlerts(
  organizationId?: string,
  limit = 200
): Promise<LifecycleAlertBatchResult> {
  const errors: Array<{ projectId: string; error: string }> = [];
  const results: LifecycleAlertResult[] = [];
  let totalAlertsFired = 0;
  let totalAlertsDebounced = 0;

  // Query active projects (not closed/sold)
  let query = adminDb.collection('projects')
    .where('status', 'in', ['Active', 'Under Contract', 'Renovating', 'Rented'])
    .limit(limit);

  if (organizationId) {
    query = adminDb.collection('projects')
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['Active', 'Under Contract', 'Renovating', 'Rented'])
      .limit(limit);
  }

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    try {
      const result = await evaluateLifecycleAlerts(doc.id, doc.data());
      results.push(result);
      totalAlertsFired += result.alertsFired.length;
      totalAlertsDebounced += result.alertsDebounced.length;
    } catch (err: any) {
      errors.push({ projectId: doc.id, error: err.message ?? String(err) });
    }
  }

  console.log(
    `[LifecycleAlertEngine] Batch scan complete: ${snapshot.docs.length} projects, ` +
    `${totalAlertsFired} alerts fired, ${totalAlertsDebounced} debounced, ${errors.length} errors`
  );

  return {
    projectsScanned: snapshot.docs.length,
    totalAlertsFired,
    totalAlertsDebounced,
    errors,
    results,
  };
}
