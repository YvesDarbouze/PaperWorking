"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useProjectStore } from "@/store/projectStore";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawEntry {
  id: string;
  projectId: string;
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
  source: "manual" | "vendor" | "system";
  userId: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
}

interface FeedItem {
  id: string;
  projectId: string;
  projectName: string;
  icon: string;
  iconColor: string;
  actor: string;
  action: string;
  target: string;
  ts: Date;
}

// ─── Field → display mapping ──────────────────────────────────────────────────

function toDisplay(fieldPath: string, newValue: unknown, source: string): Pick<FeedItem, "icon" | "iconColor" | "action" | "target"> {
  const fp = fieldPath.toLowerCase();
  const val = String(newValue ?? "");

  if (fp.includes("phase") || fp.includes("status"))
    return { icon: "swap_horiz",      iconColor: "#7A9EAA", action: "Phase transition", target: val || "updated" };
  if (fp.includes("purchaseprice") || fp.includes("price"))
    return { icon: "payments",        iconColor: "#454955", action: "Price updated",    target: val ? `$${Number(newValue).toLocaleString()}` : "" };
  if (fp.includes("document"))
    return { icon: "upload_file",     iconColor: "#818cf8", action: "Document added",   target: val };
  if (fp.includes("noi") || fp.includes("cashflow") || fp.includes("caprate"))
    return { icon: "analytics",       iconColor: "#454955", action: "Metric updated",   target: fp.split(".").pop() ?? fp };
  if (fp.includes("rehab") || fp.includes("lineitem") || fp.includes("renovation"))
    return { icon: "construction",    iconColor: "#ffac5a", action: "Rehab update",     target: fp.split(".").pop() ?? fp };
  if (fp.includes("team") || fp.includes("member") || fp.includes("vendor"))
    return { icon: "person_add",      iconColor: "#3f7d20", action: "Team change",      target: val };
  if (fp.includes("offer") || fp.includes("bid"))
    return { icon: "gavel",           iconColor: "#fbbf24", action: "Offer updated",    target: val };
  if (fp.includes("loanamount") || fp.includes("interest"))
    return { icon: "account_balance", iconColor: "#7A9EAA", action: "Financing updated", target: val };
  return { icon: "edit_note", iconColor: "rgba(186,202,197,0.6)", action: "Updated", target: fp.split(".").pop() ?? fp };
}

function actorLabel(source: string): string {
  if (source === "system") return "System";
  if (source === "vendor") return "Vendor";
  return "You";
}

function timeAgo(ts: Date): string {
  const s = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (s < 60)         return `${s}s ago`;
  if (s < 3600)       return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)      return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalAuditFeed() {
  const projects = useProjectStore((s) => s.projects);
  const [entries, setEntries] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Up to 5 most-recently-updated projects to keep listener count low
  const watchedProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const at = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt ?? 0).getTime();
        const bt = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt ?? 0).getTime();
        return bt - at;
      })
      .slice(0, 5);
  }, [projects]);

  useEffect(() => {
    if (watchedProjects.length === 0) { setLoading(false); return; }

    const allEntries = new Map<string, FeedItem>();

    const unsubs = watchedProjects.map((project) => {
      const q = query(
        collection(db, "projects", project.id, "activityLog"),
        orderBy("timestamp", "desc"),
        limit(5),
      );

      return onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          const raw = { id: d.id, projectId: project.id, ...d.data() } as RawEntry;
          const ts = raw.timestamp?.seconds
            ? new Date(raw.timestamp.seconds * 1000)
            : new Date(0);
          const display = toDisplay(raw.fieldPath, raw.newValue, raw.source);
          allEntries.set(`${project.id}:${d.id}`, {
            ...display,
            id: `${project.id}:${d.id}`,
            projectId: project.id,
            projectName: project.propertyName || project.address || "Project",
            actor: actorLabel(raw.source),
            ts,
          });
        });

        // Rebuild sorted list
        const sorted = [...allEntries.values()]
          .filter((e) => e.ts.getTime() > 0)
          .sort((a, b) => b.ts.getTime() - a.ts.getTime())
          .slice(0, 20);

        setEntries(sorted);
        setLoading(false);
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [watchedProjects]);

  const isEmpty = !loading && entries.length === 0;

  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        background: "linear-gradient(135deg, rgba(22,19,24,0.6) 0%, rgba(13,10,11,0.85) 100%)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex justify-between items-center flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-base" style={{ color: "#454955" }}>
            notifications_active
          </span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(253,255,252,0.5)" }}>
            System Activity
          </span>
        </div>
        {!loading && (
          <span className="text-[10px] font-mono" style={{ color: "rgba(253,255,252,0.2)" }}>
            {entries.length} events
          </span>
        )}
      </div>

      {/* Feed */}
      <div
        className="flex-1 overflow-y-auto px-4 py-2 min-h-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}
      >
        {loading && (
          <div className="flex flex-col gap-3 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 rounded w-3/4" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="h-2 rounded w-1/2"   style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <span className="material-symbols-outlined text-3xl mb-2" style={{ color: "rgba(253,255,252,0.15)" }}>
              history
            </span>
            <p className="text-xs" style={{ color: "rgba(253,255,252,0.25)" }}>
              Activity appears here as you update your projects.
            </p>
          </div>
        )}

        {entries.map((item, idx) => (
          <Link
            key={item.id}
            href={`/dashboard/projects/${item.projectId}`}
            className="flex gap-3 py-3 group"
            style={{ borderBottom: idx < entries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform"
              style={{ background: `${item.iconColor}14` }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px", color: item.iconColor, fontVariationSettings: "'FILL' 0" }}>
                {item.icon}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[12px] font-semibold" style={{ color: "rgba(253,255,252,0.8)" }}>
                  {item.actor}
                </span>
                <span className="text-[11px]" style={{ color: "rgba(253,255,252,0.4)" }}>
                  {item.action}
                </span>
              </div>
              <p className="text-[11px] truncate" style={{ color: "rgba(253,255,252,0.3)" }}>
                {item.projectName}{item.target ? ` · ${item.target}` : ""}
              </p>
            </div>

            {/* Timestamp */}
            <span className="text-[10px] font-mono flex-shrink-0 pt-1" style={{ color: "rgba(253,255,252,0.2)" }}>
              {timeAgo(item.ts)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
