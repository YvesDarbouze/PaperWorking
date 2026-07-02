"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";

interface ValuationSnapshot {
  id: string;
  projectId: string;
  valueCents: number;
  valueLowCents: number;
  valueHighCents: number;
  source: string;
  fetchedAt: string;
  createdAt: string;
}

interface ValuationHistoryProps {
  projectId: string;
}

async function fetchValuationSnapshots(projectId: string, idToken: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/valuation`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch valuation snapshots: ${res.status}`);
  const data = await res.json();
  return data.snapshots as ValuationSnapshot[];
}

async function triggerNewValuation(projectId: string, idToken: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/valuation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Failed to run AVM update: ${res.status}`);
  }
  return res.json();
}

function fmtDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtDate(dStr: string): string {
  return new Date(dStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ValuationHistory({ projectId }: ValuationHistoryProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const { data: snapshots = [], isLoading, isError } = useQuery({
    queryKey: ["project-valuations", projectId],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready");
      return fetchValuationSnapshots(projectId, token);
    },
    enabled: !!projectId && !!user,
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready");
      return triggerNewValuation(projectId, token);
    },
    onMutate: () => {
      setUpdating(true);
    },
    onSuccess: () => {
      toast.success("AVM valuation snapshot appended successfully!");
      qc.invalidateQueries({ queryKey: ["project-valuations", projectId] });
      qc.invalidateQueries({ queryKey: ["property-facts", projectId] });
      // Invalidate layout workspace projects queries to refresh sidebar values
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to trigger re-valuation");
    },
    onSettled: () => {
      setUpdating(false);
    },
  });

  // Chronological snapshots (oldest to newest)
  const chronoSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime());
  }, [snapshots]);

  // Derived metrics from snapshots
  const metrics = useMemo(() => {
    if (chronoSnapshots.length < 1) return null;

    const latest = chronoSnapshots[chronoSnapshots.length - 1];
    const earliest = chronoSnapshots[0];
    const difference = latest.valueCents - earliest.valueCents;
    const pctChange = earliest.valueCents > 0 ? (difference / earliest.valueCents) * 100 : 0;

    return {
      latest,
      earliest,
      difference,
      pctChange,
      hasAppreciation: chronoSnapshots.length >= 2,
    };
  }, [chronoSnapshots]);

  if (isLoading) {
    return (
      <div className="rounded-xl p-5 border border-white/5 bg-pw-bg animate-pulse space-y-4">
        <div className="h-4 bg-white/10 rounded w-1/4" />
        <div className="h-10 bg-white/10 rounded w-1/2" />
        <div className="h-20 bg-white/10 rounded w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl p-5 border border-red-500/20 bg-red-500/5 text-center">
        <p className="text-sm text-red-400">Failed to load valuation snapshots history.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 border border-white/5 space-y-6 overflow-hidden relative group"
      style={{ background: "rgba(22,19,24,0.6)", backdropFilter: "blur(12px)" }}
    >
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#454955]/5 rounded-full blur-3xl group-hover:bg-[#454955]/10 transition-all duration-300" />
      
      {/* Header section */}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
            Live Valuation History (AVM)
          </h3>
          {metrics && (
            <div className="mt-1 space-y-0.5">
              <p className="text-2xl font-bold tracking-tight text-text-primary">
                {fmtDollars(metrics.latest.valueCents)}
              </p>
              <p className="text-[11px] text-text-secondary">
                Range: {fmtDollars(metrics.latest.valueLowCents)} – {fmtDollars(metrics.latest.valueHighCents)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => triggerMutation.mutate()}
          disabled={updating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150"
          style={{
            background: "rgba(69,73,85,0.12)",
            border: "1px solid rgba(69,73,85,0.22)",
            color: "#454955",
            opacity: updating ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined text-[14px] animate-spin" style={{ animationDuration: updating ? "1.5s" : "0s", display: updating ? "inline-block" : "none" }}>
            sync
          </span>
          <span className="material-symbols-outlined text-[14px]" style={{ display: updating ? "none" : "inline-block" }}>
            analytics
          </span>
          {updating ? "Revaluing…" : "Update Value"}
        </button>
      </div>

      {/* Appreciation readout banner */}
      {metrics?.hasAppreciation ? (
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{
            background: metrics.difference >= 0 ? "rgba(69,73,85,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${metrics.difference >= 0 ? "rgba(69,73,85,0.15)" : "rgba(239,68,68,0.15)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-lg"
              style={{ color: metrics.difference >= 0 ? "#454955" : "#F06543" }}
            >
              {metrics.difference >= 0 ? "trending_up" : "trending_down"}
            </span>
            <div className="text-[11px]">
              <span className="font-semibold text-text-primary">Hold-period appreciation</span>
              <p className="text-text-secondary mt-0.5">
                From {fmtDate(metrics.earliest.fetchedAt)} to {fmtDate(metrics.latest.fetchedAt)}
              </p>
            </div>
          </div>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: metrics.difference >= 0 ? "#454955" : "#F06543" }}
          >
            {metrics.difference >= 0 ? "+" : ""}{fmtDollars(metrics.difference)} ({metrics.difference >= 0 ? "+" : ""}{metrics.pctChange.toFixed(1)}%)
          </span>
        </div>
      ) : (
        chronoSnapshots.length === 1 && (
          <div className="rounded-xl p-3 border border-white/5 bg-white/5 flex gap-2 items-start">
            <span className="material-symbols-outlined text-sm mt-0.5 text-text-secondary">info</span>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              First snapshot captured on {fmtDate(chronoSnapshots[0].fetchedAt)}. Update valuation again over time (e.g. monthly) to track real hold-period appreciation.
            </p>
          </div>
        )
      )}

      {/* Timeline view */}
      {chronoSnapshots.length > 0 ? (
        <div className="relative border-l border-white/5 pl-4 ml-1.5 space-y-4 pt-1">
          {chronoSnapshots.slice().reverse().map((snap, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={snap.id} className="relative flex justify-between items-start text-xs">
                {/* Timeline node */}
                <div
                  className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border flex items-center justify-center"
                  style={{
                    background: isLatest ? "#454955" : "rgba(22,19,24,1)",
                    borderColor: isLatest ? "#454955" : "rgba(255,255,255,0.12)",
                    boxShadow: isLatest ? "0 0 10px rgba(69,73,85,0.4)" : "none",
                  }}
                />
                
                {/* Snapshot Details */}
                <div>
                  <p className="font-semibold text-text-primary">
                    {fmtDollars(snap.valueCents)}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Range: {fmtDollars(snap.valueLowCents)} – {fmtDollars(snap.valueHighCents)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-medium text-text-secondary">
                    {fmtDate(snap.fetchedAt)}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-text-secondary/60 mt-0.5">
                    {snap.source}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center border border-dashed border-white/5 rounded-xl">
          <p className="text-xs text-text-secondary">No valuation snapshots recorded yet.</p>
        </div>
      )}

      <p className="text-[9px] text-text-secondary/50 leading-relaxed pt-1 border-t border-white/5">
        * Valuation history is compiled using automated AVM point estimates. Automated estimates do not replace certified appraisals. Sourced via RentCast API.
      </p>
    </div>
  );
}
