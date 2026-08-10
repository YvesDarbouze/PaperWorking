// ═══════════════════════════════════════════════════════
//  PaperWorking Workflow Event Stream — Derived Notifications
// ═══════════════════════════════════════════════════════

import type { Project } from "@/types/schema";
import type { NotificationType } from "@/types/notification";
import { compute1031Deadlines } from "@/lib/utils/exchange1031";

export interface DerivedWorkflowNotification {
  id: string;
  projectId: string;
  projectName: string;
  type: NotificationType;
  priority: "critical" | "warning" | "info";
  title: string;
  body: string;
  deepLinkUrl: string;
  createdAt: Date;
  read?: boolean;
}

export const WORKFLOW_EVENT_TYPES: NotificationType[] = [
  "gate_criteria_failing",
  "gate_override_executed",
  "variance_threshold_tripped",
  "exchange_1031_deadline",
  "checklist_item_overdue",
  "document_upload_completed",
];

function projectLabel(p: Project): string {
  return p.propertyName || p.address || "Unnamed Project";
}

function daysUntil(dateStrOrObj: string | Date | undefined): number | null {
  if (!dateStrOrObj) return null;
  const d = dateStrOrObj instanceof Date ? dateStrOrObj : new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/**
 * Derives workflow notifications dynamically from active projects and evaluates
 * user-level preference suppression toggles.
 */
export function deriveWorkflowNotifications(
  projects: Project[],
  preferences?: Record<string, boolean>
): DerivedWorkflowNotification[] {
  const notifications: DerivedWorkflowNotification[] = [];

  for (const p of projects) {
    const pid = p.id;
    const name = projectLabel(p);
    const f = p.financials;
    const phase = p.currentPhase ?? 1;

    // 1. gate_criteria_failing: missing or blocked criteria
    if (phase === 2 && f && f.purchasePrice && !f.loanAmount && !p.isClearToClose) {
      if (preferences?.gate_criteria_failing !== false) {
        notifications.push({
          id: `gate-fail-${pid}`,
          projectId: pid,
          projectName: name,
          type: "gate_criteria_failing",
          priority: "warning",
          title: `Phase Gate Blocked: ${name}`,
          body: `Phase 2 acquisition gate requires financing details to reach Clear-to-Close.`,
          deepLinkUrl: `/dashboard/projects/${pid}?tab=timeline`,
          createdAt: new Date(),
        });
      }
    }

    // 2. gate_override_executed: override event logged
    const gateEvents = (p as any).phaseGateEvents;
    if (Array.isArray(gateEvents) && gateEvents.some((e: any) => e.overrideReason)) {
      if (preferences?.gate_override_executed !== false) {
        const lastOverride = [...gateEvents].reverse().find((e: any) => e.overrideReason);
        notifications.push({
          id: `gate-override-${pid}-${lastOverride?.id || 'event'}`,
          projectId: pid,
          projectName: name,
          type: "gate_override_executed",
          priority: "critical",
          title: `Phase Gate Override Executed: ${name}`,
          body: `An owner override was logged with reason: "${lastOverride?.overrideReason?.slice(0, 50)}..."`,
          deepLinkUrl: `/dashboard/projects/${pid}?tab=timeline`,
          createdAt: lastOverride?.createdAt ? new Date(lastOverride.createdAt) : new Date(),
        });
      }
    }

    // 3. variance_threshold_tripped: Phase 3 operational NOI variance > ±10% for 2+ consecutive periods
    const fin: any = p.financials;
    if (phase === 3 && fin) {
      const actuals = Array.isArray(fin.propertyActuals) ? fin.propertyActuals : [];
      const baseNoi = fin.budgetBaseline?.monthlyNoi || 2000;
      const consecutiveExceeded = actuals.length >= 2 && actuals.filter((a: any) => {
        const noi = a.noi ?? (a.grossRent - a.operatingExpenses);
        return Math.abs(((noi - baseNoi) / baseNoi) * 100) > 10;
      }).length >= 2;

      if ((fin.operationalVarianceAlert || consecutiveExceeded) && preferences?.variance_threshold_tripped !== false) {
        notifications.push({
          id: `variance-tripped-${pid}`,
          projectId: pid,
          projectName: name,
          type: "variance_threshold_tripped",
          priority: "critical",
          title: `Operational NOI Variance Alert: ${name}`,
          body: `Operational NOI variance exceeded ±10% threshold for 2+ consecutive periods.`,
          deepLinkUrl: `/dashboard/projects/${pid}/operations`,
          createdAt: new Date(),
        });
      }
    }

    // 4. exchange_1031_deadline: 1031 exchange sale date set & identification (45d) or exchange (180d) deadline within 14 days
    if (f?.soldDate) {
      const { identificationDeadline, exchangeDeadline } = compute1031Deadlines(f.soldDate);
      const daysToId = daysUntil(identificationDeadline);
      const daysToEx = daysUntil(exchangeDeadline);

      const isApproaching = (daysToId !== null && daysToId >= 0 && daysToId <= 14) ||
                            (daysToEx !== null && daysToEx >= 0 && daysToEx <= 14);

      if (isApproaching && preferences?.exchange_1031_deadline !== false) {
        const closestDays = daysToId !== null && daysToId >= 0 && daysToId <= 14 ? daysToId : daysToEx;
        notifications.push({
          id: `1031-deadline-${pid}`,
          projectId: pid,
          projectName: name,
          type: "exchange_1031_deadline",
          priority: "critical",
          title: `1031 Statutory Deadline Approaching: ${name}`,
          body: `1031 exchange statutory deadline is in ${closestDays} days. Ensure replacement properties are identified.`,
          deepLinkUrl: `/dashboard/projects/${pid}/phase-4`,
          createdAt: new Date(),
        });
      }
    }

    // 5. checklist_item_overdue: overdue action items or disposition tasks
    if (Array.isArray(p.actionItems)) {
      for (const task of p.actionItems) {
        const isDone = task.completed || task.status === "done" || task.status === "complete";
        if (!isDone && task.dueDate) {
          const days = daysUntil(task.dueDate);
          if (days !== null && days < 0 && preferences?.checklist_item_overdue !== false) {
            const taskTitle = task.label || task.title || "Checklist Task";
            notifications.push({
              id: `task-overdue-${pid}-${task.id || taskTitle}`,
              projectId: pid,
              projectName: name,
              type: "checklist_item_overdue",
              priority: "warning",
              title: `Task Overdue: ${taskTitle}`,
              body: `Task "${taskTitle}" on ${name} was due ${Math.abs(days)} days ago.`,
              deepLinkUrl: `/dashboard/projects/${pid}?tab=tasks`,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    // 6. document_upload_completed: document uploads completed
    const docs = (p as any).preApprovalDocuments;
    if (Array.isArray(docs) && docs.length > 0) {
      if (preferences?.document_upload_completed !== false) {
        const lastDoc = docs[docs.length - 1];
        notifications.push({
          id: `doc-upload-${pid}-${lastDoc.slice(-8)}`,
          projectId: pid,
          projectName: name,
          type: "document_upload_completed",
          priority: "info",
          title: `Document Uploaded: ${name}`,
          body: `A project document (${lastDoc.split('/').pop() || 'file'}) was successfully uploaded.`,
          deepLinkUrl: `/dashboard/projects/${pid}?tab=documents`,
          createdAt: new Date(),
        });
      }
    }
  }

  // Priority order: critical → warning → info
  const TIER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  return notifications.sort((a, b) => TIER[a.priority] - TIER[b.priority]);
}
