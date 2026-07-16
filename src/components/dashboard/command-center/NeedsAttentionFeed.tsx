"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import { useTheme } from "@/lib/utils/ThemeProvider";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/types/schema";

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
          metadata: `${name} · Transaction phase`,
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

  // Theme-adaptive tokens
  const panelBg     = isDark
    ? "linear-gradient(135deg, rgba(30,27,32,0.65) 0%, rgba(18,16,20,0.88) 100%)"
    : "#FFFFFF";
  const panelBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.10)";
  const panelShadow = isDark ? "0 8px 32px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.06)";
  const headerBorderB = isDark ? "rgba(255,255,255,0.06)" : "rgba(69,73,85,0.08)";
  const labelColor  = isDark ? "rgba(253,255,252,0.55)" : "rgba(69,73,85,0.65)";
  const metaColor   = isDark ? "rgba(253,255,252,0.28)" : "rgba(69,73,85,0.45)";
  const itemHoverBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(69,73,85,0.03)";
  const itemDivider = isDark ? "rgba(255,255,255,0.04)"  : "rgba(69,73,85,0.07)";

  return (
    <section
      aria-label="Needs attention"
      className="rounded-2xl overflow-hidden"
      style={{
        background: panelBg,
        backdropFilter: isDark ? "blur(24px)" : undefined,
        WebkitBackdropFilter: isDark ? "blur(24px)" : undefined,
        border: `1px solid ${panelBorder}`,
        boxShadow: panelShadow,
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-3.5 flex justify-between items-center"
        style={{ borderBottom: `1px solid ${headerBorderB}` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{
              color: hasCritical ? "#F06543" : items.length > 0 ? "#ffac5a" : "var(--pw-success)",
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {hasCritical ? "warning" : items.length > 0 ? "pending_actions" : "check_circle"}
          </span>
          <span
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: "0.08em", color: labelColor }}
          >
            Action Center
          </span>
          {items.length > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: hasCritical ? "rgba(240,101,67,0.12)" : "rgba(255,172,90,0.12)",
                color: hasCritical ? "#F06543" : "#ffac5a",
              }}
            >
              {items.length} pending
            </span>
          )}
        </div>
        {items.length > 0 && (
          <span className="text-[11px]" style={{ color: metaColor }}>
            {items.filter((i: AttentionItem) => i.priority === "critical").length > 0
              ? `${items.filter((i: AttentionItem) => i.priority === "critical").length} critical`
              : `${items.length} task${items.length === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {/* ── Empty State ── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <span
            className="material-symbols-outlined text-4xl mb-3"
            style={{ color: "var(--pw-success)", fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <p
            className="text-[14px] font-semibold mb-1"
            style={{ color: isDark ? "rgba(253,255,252,0.85)" : "#0d0a0b" }}
          >
            All clear.
          </p>
          <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: metaColor }}>
            No pending tasks, deadlines, or blockers right now.
          </p>
        </div>
      )}

      {/* ── Item List ── */}
      {!isEmpty && (
        <div aria-live="polite">
          <AnimatePresence initial={false}>
            {visible.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div
                  className="flex items-start gap-4 px-5 py-3.5 group cursor-pointer transition-colors duration-100"
                  style={{
                    borderLeft: `3px solid ${item.borderColor}`,
                    borderBottom: idx < visible.length - 1 ? `1px solid ${itemDivider}` : "none",
                  }}
                  onClick={() => router.push(item.ctaHref)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = itemHoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Icon chip */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${item.iconColor}18` }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "16px",
                        color: item.iconColor,
                        fontVariationSettings: "'FILL' 0",
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-medium leading-snug mb-1"
                      style={{ color: isDark ? "rgba(253,255,252,0.9)" : "#0d0a0b" }}
                    >
                      {item.description}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: metaColor }}>
                      {item.projectName} · {item.metadata}
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    aria-label={`${item.ctaLabel} for ${item.projectName}`}
                    className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                    style={{
                      background: `${item.borderColor}15`,
                      color: item.borderColor,
                      border: `1px solid ${item.borderColor}28`,
                    }}
                    onClick={(e) => { e.stopPropagation(); router.push(item.ctaHref); }}
                  >
                    {item.ctaLabel}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Expand / collapse */}
          {!expanded && hidden > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full py-3 text-[12px] font-medium transition-opacity duration-150 hover:opacity-70 cursor-pointer"
              style={{ color: metaColor, borderTop: `1px solid ${itemDivider}` }}
            >
              Show {hidden} more →
            </button>
          )}
          {expanded && items.length > INITIAL_COUNT && (
            <button
              onClick={() => setExpanded(false)}
              className="w-full py-3 text-[12px] font-medium hover:opacity-70 cursor-pointer"
              style={{ color: metaColor, borderTop: `1px solid ${itemDivider}` }}
            >
              Collapse ↑
            </button>
          )}
        </div>
      )}
    </section>
  );
}
