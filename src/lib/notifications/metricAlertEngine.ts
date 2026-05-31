/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Metric Alert Engine
 *
 * Server-side engine that evaluates project metrics against
 * critical thresholds and fires notifications when violated.
 *
 * Triggers:
 *   - DSCR < 1.0 → critical
 *   - Occupancy < 80% → actionable
 *   - Cash Flow < 0 (negative) → critical
 *   - OER jump > 10 percentage points → actionable
 *
 * Debounce: 24h per project per alert type (prevents spam).
 * Uses the existing NotificationService for delivery.
 * ═══════════════════════════════════════════════════════
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NotificationService } from '@/lib/services/notificationService';
import type { DerivedMetrics } from '@/lib/metrics/reiMetrics';
import {
  type MetricAlertType,
  ALERT_METADATA,
  buildAlertTitle,
  buildAlertBody,
  buildAlertDeepLink,
  type AlertContentParams,
} from './notificationTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetricAlertEvaluation {
  alertType: MetricAlertType;
  triggered: boolean;
  currentValue: number;
  threshold: number;
  previousValue?: number;
}

export interface MetricAlertResult {
  projectId: string;
  evaluations: MetricAlertEvaluation[];
  alertsFired: MetricAlertType[];
  alertsDebounced: MetricAlertType[];
}

interface MetricAlertContext {
  projectId: string;
  address: string;
  ownerUid: string;
  organizationId: string;
  metrics: DerivedMetrics;
  /** Previous OER for comparison (from the most recent snapshot) */
  previousOER?: number | null;
}

// ── Debounce Check ────────────────────────────────────────────────────────────

const DEBOUNCE_COLLECTION = 'metricAlertDebounce';

/**
 * Checks if a specific alert has been fired for a project within the debounce window.
 * Returns true if the alert should be suppressed (still within cooldown).
 */
async function isDebounced(
  projectId: string,
  alertType: MetricAlertType
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

/**
 * Records that an alert was just fired (updates debounce timestamp).
 */
async function recordAlertFired(
  projectId: string,
  alertType: MetricAlertType
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

// ── Metric Threshold Evaluators ───────────────────────────────────────────────

function evaluateDSCR(metrics: DerivedMetrics): MetricAlertEvaluation {
  const threshold = 1.0;
  const dscr = metrics.dscr;
  // Infinity means no debt → never a problem. 0 means no income and no debt → skip.
  const isFiniteDSCR = Number.isFinite(dscr) && dscr !== 0;
  return {
    alertType: 'DSCR_BELOW_THRESHOLD',
    triggered: isFiniteDSCR && dscr < threshold,
    currentValue: isFiniteDSCR ? dscr : 0,
    threshold,
  };
}

function evaluateOccupancy(metrics: DerivedMetrics): MetricAlertEvaluation {
  const threshold = 80;
  return {
    alertType: 'OCCUPANCY_LOW',
    triggered: metrics.occupancyRate < threshold && !metrics.isOccupancyAssumption,
    currentValue: metrics.occupancyRate,
    threshold,
  };
}

function evaluateCashFlow(metrics: DerivedMetrics): MetricAlertEvaluation {
  const threshold = 0;
  return {
    alertType: 'CASHFLOW_NEGATIVE',
    triggered: metrics.annualCashFlow < threshold,
    currentValue: metrics.annualCashFlow,
    threshold,
  };
}

function evaluateExpenseRatioSpike(
  metrics: DerivedMetrics,
  previousOER?: number | null
): MetricAlertEvaluation {
  const threshold = 10; // 10 percentage point jump
  const hasComparison = previousOER != null && previousOER > 0;
  const spike = hasComparison ? metrics.oer - previousOER! : 0;

  return {
    alertType: 'EXPENSE_RATIO_SPIKE',
    triggered: hasComparison && spike >= threshold,
    currentValue: metrics.oer,
    threshold,
    previousValue: previousOER ?? undefined,
  };
}

// ── Main Evaluation Engine ────────────────────────────────────────────────────

/**
 * Evaluates all metric thresholds for a project and fires notifications
 * for any violations that haven't been debounced.
 *
 * @param context Project context with pre-computed metrics
 * @returns Summary of evaluations and fired alerts
 */
export async function evaluateMetricAlerts(
  context: MetricAlertContext
): Promise<MetricAlertResult> {
  const { projectId, address, ownerUid, metrics, previousOER } = context;

  // Run all evaluations
  const evaluations: MetricAlertEvaluation[] = [
    evaluateDSCR(metrics),
    evaluateOccupancy(metrics),
    evaluateCashFlow(metrics),
    evaluateExpenseRatioSpike(metrics, previousOER),
  ];

  const alertsFired: MetricAlertType[] = [];
  const alertsDebounced: MetricAlertType[] = [];

  // Process triggered alerts
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
      currentValue: evaluation.currentValue,
      threshold: evaluation.threshold,
      previousValue: evaluation.previousValue,
    };

    const title = buildAlertTitle(evaluation.alertType, contentParams);
    const body = buildAlertBody(evaluation.alertType, contentParams);
    const deepLinkUrl = buildAlertDeepLink(projectId, evaluation.alertType);
    const meta = ALERT_METADATA[evaluation.alertType];

    try {
      // Fire notification through the existing NotificationService
      await NotificationService.createNotification({
        recipientId: ownerUid,
        type: meta.notificationType,
        actor: {
          uid: 'system',
          name: 'PaperWorking Metrics Engine',
        },
        objectReference: {
          projectId,
          dealAddress: address,
          // Encode metric data in metadata for email template rendering
          dailyBurnRate: evaluation.alertType === 'CASHFLOW_NEGATIVE'
            ? `$${Math.abs(evaluation.currentValue / 365).toFixed(0)}`
            : undefined,
          metadata: {
            alertType: evaluation.alertType,
            metricName: evaluation.alertType,
            currentValue: evaluation.currentValue,
            threshold: evaluation.threshold,
            previousValue: evaluation.previousValue,
            title,
            body,
          },
        },
        deepLinkUrl,
      });

      // Record debounce
      await recordAlertFired(projectId, evaluation.alertType);
      alertsFired.push(evaluation.alertType);

      console.log(
        `[MetricAlertEngine] Fired ${evaluation.alertType} for ${address} (${projectId}): ` +
        `value=${evaluation.currentValue}, threshold=${evaluation.threshold}`
      );
    } catch (err) {
      console.error(
        `[MetricAlertEngine] Failed to fire ${evaluation.alertType} for ${projectId}:`,
        err
      );
    }
  }

  return {
    projectId,
    evaluations,
    alertsFired,
    alertsDebounced,
  };
}

// ── Convenience: Evaluate from raw project data ───────────────────────────────

/**
 * Fetches the previous OER from the most recent snapshot for comparison.
 */
async function fetchPreviousOER(projectId: string): Promise<number | null> {
  try {
    const snapshotQuery = adminDb
      .collection('propertyMetricSnapshots')
      .where('projectId', '==', projectId)
      .orderBy('createdAt', 'desc')
      .limit(2); // Get the two most recent: [current, previous]

    const snap = await snapshotQuery.get();
    if (snap.docs.length < 2) return null;

    // The second document is the previous period
    const prevData = snap.docs[1].data();
    return prevData?.oer ?? null;
  } catch (err) {
    console.error(`[MetricAlertEngine] Failed to fetch previous OER for ${projectId}:`, err);
    return null;
  }
}

/**
 * High-level entry point: Given a project ID and its derived metrics,
 * looks up context from Firestore and runs the full evaluation.
 */
export async function evaluateMetricAlertsForProject(
  projectId: string,
  metrics: DerivedMetrics
): Promise<MetricAlertResult> {
  // Fetch project data for context
  const projectDoc = await adminDb.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) {
    console.warn(`[MetricAlertEngine] Project ${projectId} not found, skipping alert evaluation.`);
    return { projectId, evaluations: [], alertsFired: [], alertsDebounced: [] };
  }

  const projectData = projectDoc.data()!;
  const previousOER = await fetchPreviousOER(projectId);

  return evaluateMetricAlerts({
    projectId,
    address: projectData.address ?? projectData.propertyName ?? 'Unknown Property',
    ownerUid: projectData.ownerUid,
    organizationId: projectData.organizationId,
    metrics,
    previousOER,
  });
}
