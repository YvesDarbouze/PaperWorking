"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/types/schema";
import { ccTokens } from "./ccTheme";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttentionPriority = "critical" | "warning" | "info";

interface AttentionItem {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  priority: AttentionPriority;
  borderColor: string;
  icon: string;
  iconColor: string;
  description: string;
  metadata: string;
  ctaLabel: string;
  ctaHref: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(date: Date | string | undefined): number | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function relativeDate(date: Date | string | undefined): string {
  const days = daysUntil(date);
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `in ${days}d`;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function projectLabel(p: Project): string {
  return p.propertyName || p.address || "Unnamed Project";
}

// ─── Derivation ───────────────────────────────────────────────────────────────

const PHASE_LABELS = ["", "Acquisition", "Fund", "Hold", "Exit"];

function deriveAttentionItems(projects: Project[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const p of projects) {
    const f = p.financials;
    const name = projectLabel(p);
    const phase = p.currentPhase ?? 1;
    const pid = p.id;

    // 1. Contingency deadlines expiring within 7 days
    if (p.contingencies) {
      for (const c of p.contingencies) {
        if (c.isWaived || c.isSatisfied) continue;
        const days = daysUntil(c.deadlineDate);
        if (days !== null && days >= 0 && days <= 7) {
          const isCritical = days <= 2;
          const dl = c.deadlineDate instanceof Date
            ? c.deadlineDate.toLocaleDateString()
            : new Date(c.deadlineDate as unknown as string).toLocaleDateString();
          items.push({
            id: `contingency-${pid}-${c.id}`,
            projectId: pid,
            projectName: name,
            type: "deadline_expiring",
            priority: isCritical ? "critical" : "warning",
            borderColor: isCritical ? "#F06543" : "#ffd1aa",
            icon: "alarm",
            iconColor: isCritical ? "#F06543" : "#ffd1aa",
            description: `${c.type} contingency expires ${relativeDate(c.deadlineDate)}`,
            metadata: `${name} · Due ${dl}`,
            ctaLabel: "View deadline",
            ctaHref: `/dashboard/projects/${pid}?tab=timeline`,
          });
        }
      }
    }

    // 2. Rehab budget overrun
    if (phase === 3 && f) {
      const budget = f.rehabBudget ?? f.projectedRehabCost ?? 0;
      const actual = f.rehabActual ?? 0;
      if (budget > 0 && actual > budget) {
        items.push({
          id: `overrun-${pid}`,
          projectId: pid,
          projectName: name,
          type: "budget_overrun",
          priority: "warning",
          borderColor: "#ffd1aa",
          icon: "trending_down",
          iconColor: "#ffd1aa",
          description: `Rehab is ${formatCurrency(actual - budget)} over the approved budget`,
          metadata: `${name} · ${formatCurrency(actual)} of ${formatCurrency(budget)} approved`,
          ctaLabel: "View budget",
          ctaHref: `/dashboard/projects/${pid}?tab=rehab`,
        });
      }
    }

    // 3. Overdue action items
    if (Array.isArray(p.actionItems)) {
      for (const task of p.actionItems) {
        const isDone =
          task.completed === true ||
          task.status === "done" ||
          task.status === "complete" ||
          task.status === "completed";
        if (isDone || !task.dueDate) continue;
        const dueD = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
        const days = daysUntil(dueD);
        if (days !== null && days < 0) {
          const taskLabel: string = task.label ?? task.title ?? task.text ?? "Task";
          items.push({
            id: `task-${pid}-${task.id ?? taskLabel}`,
            projectId: pid,
            projectName: name,
            type: "task_overdue",
            priority: "warning",
            borderColor: "#ffd1aa",
            icon: "assignment_late",
            iconColor: "#ffd1aa",
            description: `"${taskLabel}" was due ${relativeDate(dueD)}`,
            metadata: `${name} · Assigned to you`,
            ctaLabel: "Open task",
            ctaHref: `/dashboard/projects/${pid}?tab=tasks`,
          });
        }
      }
    }

    // 4. Transaction stalled — phase 2 with purchase price but no loan amount
    if (phase === 2 && f) {
      const hasPrice = (f.purchasePrice ?? 0) > 0;
      const hasLoan = (f.loanAmount ?? 0) > 0;
      if (hasPrice && !hasLoan && !p.isClearToClose) {
        items.push({
          id: `ctc-${pid}`,
          projectId: pid,
          projectName: name,
          type: "phase_gate_blocked",
          priority: "warning",
          borderColor: "#ffd1aa",
          icon: "lock_clock",
          iconColor: "#ffd1aa",
          description: "Transaction needs financing details to reach clear-to-close",
          metadata: `${name} · ${PHASE_LABELS[phase] || "Acquisition"} phase`,
          ctaLabel: "Open deal",
          ctaHref: `/dashboard/projects/${pid}`,
        });
      }
    }
  }

  // Sort: critical → warning → info; stable within tiers
  const TIER: Record<AttentionPriority, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => TIER[a.priority] - TIER[b.priority]);
}

// ─── Component ────────────────────────────────────────────────────────────────

const INITIAL_COUNT = 3;

export function NeedsAttentionFeed() {
  const projects = useProjectStore((s) => s.projects);
  const router   = useRouter();
  const { theme } = useTheme();
  const isDark   = theme === "dark";
  const [expanded, setExpanded] = useState(false);

  const items   = useMemo(() => deriveAttentionItems(projects), [projects]);
  const visible = expanded ? items.slice(0, 10) : items.slice(0, INITIAL_COUNT);
  const hidden  = Math.max(0, Math.min(items.length, 10) - INITIAL_COUNT);
  const isEmpty = items.length === 0;
  const hasCritical = items.some((i: AttentionItem) => i.priority === "critical");
  const t = ccTokens(isDark);

  const statusTone = (priority: AttentionPriority) => {
    if (priority === "critical") return { fg: t.alert, bg: t.alertMuted };
    if (priority === "warning") return { fg: t.warn, bg: t.warnMuted };
    return { fg: t.accent, bg: t.accentMuted };
  };

  const headerIcon = hasCritical ? "warning" : items.length > 0 ? "pending_actions" : "check_circle";
  const headerColor = hasCritical ? t.alert : items.length > 0 ? t.warn : t.success;

  return (
    <section
      aria-label="Needs attention"
      className="overflow-hidden"
      style={{
        background: t.panelBg,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        boxShadow: t.panelShadow,
      }}
    >
      <div
        className="px-4 py-3 flex justify-between items-center gap-3"
        style={{ borderBottom: `1px solid ${t.divider}` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: headerColor, fontVariationSettings: "'FILL' 1" }}
          >
            {headerIcon}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
            Needs a decision
          </span>
          {items.length > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 tabular-nums"
              style={{
                background: hasCritical ? t.alertMuted : t.warnMuted,
                color: hasCritical ? t.alert : t.warn,
                borderRadius: 2,
              }}
            >
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-[11px] shrink-0" style={{ color: t.muted }}>
            {items.filter((i: AttentionItem) => i.priority === "critical").length > 0
              ? `${items.filter((i: AttentionItem) => i.priority === "critical").length} critical`
              : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <span
            className="material-symbols-outlined text-4xl mb-3"
            style={{ color: t.success, fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <p className="text-[14px] font-semibold mb-1" style={{ color: t.heading }}>
            All clear
          </p>
          <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: t.muted }}>
            No pending tasks, deadlines, or blockers right now.
          </p>
        </div>
      )}

      {!isEmpty && (
        <div aria-live="polite">
          <AnimatePresence initial={false}>
            {visible.map((item, idx) => {
              const tone = statusTone(item.priority);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div
                    className="flex items-start gap-3 px-4 py-3 group cursor-pointer transition-colors"
                    style={{
                      borderLeft: `3px solid ${tone.fg}`,
                      borderBottom: idx < visible.length - 1 ? `1px solid ${t.divider}` : "none",
                    }}
                    onClick={() => router.push(item.ctaHref)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: tone.bg, borderRadius: 2 }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "16px", color: tone.fg, fontVariationSettings: "'FILL' 0" }}
                      >
                        {item.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug mb-1" style={{ color: t.heading }}>
                        {item.description}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: t.muted }}>
                        {item.projectName} · {item.metadata}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`${item.ctaLabel} for ${item.projectName}`}
                      className="pw-interactive-custom flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 transition-opacity opacity-80 group-hover:opacity-100"
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        border: "none",
                        borderRadius: 2,
                        padding: "4px 10px",
                      }}
                      onClick={(e) => { e.stopPropagation(); router.push(item.ctaHref); }}
                    >
                      {item.ctaLabel}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!expanded && hidden > 0 && (
            <button
              type="button"
              className="pw-interactive-custom w-full py-3 text-[12px] font-medium transition-opacity hover:opacity-70"
              onClick={() => setExpanded(true)}
              style={{
                color: t.muted,
                borderTop: `1px solid ${t.divider}`,
                background: "transparent",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: "none",
                borderRadius: 0,
                boxShadow: "none",
              }}
            >
              Show {hidden} more
            </button>
          )}
          {expanded && items.length > INITIAL_COUNT && (
            <button
              type="button"
              className="pw-interactive-custom w-full py-3 text-[12px] font-medium hover:opacity-70"
              onClick={() => setExpanded(false)}
              style={{
                color: t.muted,
                borderTop: `1px solid ${t.divider}`,
                background: "transparent",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: "none",
                borderRadius: 0,
                boxShadow: "none",
              }}
            >
              Show less
            </button>
          )}
        </div>
      )}
    </section>
  );
}
