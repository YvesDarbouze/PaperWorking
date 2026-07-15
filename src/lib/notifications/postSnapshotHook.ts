/**
 * ═══════════════════════════════════════════════════════
 * PaperWorking — Post-Snapshot Hook
 *
 * Since there are no Cloud Functions, this hook is called
 * after the snapshotWriter persists a metric snapshot.
 *
 * It bridges snapshot writes → metric alert evaluation,
 * simulating a Firestore trigger without Cloud Functions.
 *
 * Usage:
 *   import { onSnapshotWritten } from '@/lib/notifications/postSnapshotHook';
 *   const snapResult = await writeMetricSnapshots(projectId, projectData);
 *   await onSnapshotWritten(projectId, projectData, snapResult);
 * ═══════════════════════════════════════════════════════
 */

import type { DerivedMetrics } from '@/lib/metrics/reiMetrics';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { evaluateMetricAlertsForProject, type MetricAlertResult } from './metricAlertEngine';
import type { SnapshotWriteResult } from '@/lib/firebase/snapshotWriter';
import type { ProjectFinancials } from '@/types/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PostSnapshotHookResult {
  snapshotResult: SnapshotWriteResult;
  alertResult: MetricAlertResult | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Called after a metric snapshot is written for a project.
 * Derives metrics and evaluates all metric alert thresholds.
 *
 * This is a fire-and-forget hook — errors are caught and logged
 * so they don't break the snapshot write flow.
 *
 * @param projectId   The Firestore project document ID
 * @param projectData The full project document data (used to re-derive metrics)
 * @param snapshotResult The result from writeMetricSnapshots
 */
export async function onSnapshotWritten(
  projectId: string,
  projectData: FirebaseFirestore.DocumentData,
  snapshotResult: SnapshotWriteResult
): Promise<PostSnapshotHookResult> {
  let alertResult: MetricAlertResult | null = null;

  try {
    // Re-derive metrics from the project data
    const financials = projectData.financials as ProjectFinancials | undefined;
    if (!financials) {
      console.log(`[PostSnapshotHook] Project ${projectId} has no financials, skipping alert evaluation.`);
      return { snapshotResult, alertResult };
    }

    const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
    const propertyValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;

    const metrics: DerivedMetrics = deriveAllMetrics(
      financials,
      propertyValue,
      projectData.dispositionType,
      projectData.currentPhase,
      projectData.createdAt
    );

    // Evaluate metric alerts
    alertResult = await evaluateMetricAlertsForProject(projectId, metrics);

    if (alertResult.alertsFired.length > 0) {
      console.log(
        `[PostSnapshotHook] Project ${projectId}: ${alertResult.alertsFired.length} alert(s) fired: ` +
        `${alertResult.alertsFired.join(', ')}`
      );
    }

    if (alertResult.alertsDebounced.length > 0) {
      console.log(
        `[PostSnapshotHook] Project ${projectId}: ${alertResult.alertsDebounced.length} alert(s) debounced: ` +
        `${alertResult.alertsDebounced.join(', ')}`
      );
    }
  } catch (err) {
    // Non-blocking: log error but don't propagate
    console.error(`[PostSnapshotHook] Alert evaluation failed for ${projectId}:`, err);
  }

  return { snapshotResult, alertResult };
}

/**
 * Convenience wrapper that combines writeMetricSnapshots + alert evaluation.
 * Import this in API routes that update project financials.
 *
 * @param projectId   The Firestore project document ID
 * @param projectData The full project document data (after update)
 */
export async function writeSnapshotAndEvaluateAlerts(
  projectId: string,
  projectData: FirebaseFirestore.DocumentData
): Promise<PostSnapshotHookResult> {
  // Dynamically import to avoid circular deps
  const { writeMetricSnapshots } = await import('@/lib/firebase/snapshotWriter');

  const snapshotResult = await writeMetricSnapshots(projectId, projectData);
  return onSnapshotWritten(projectId, projectData, snapshotResult);
}
