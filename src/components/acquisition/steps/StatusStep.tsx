"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import {
  AcquisitionStatus,
  ACQUISITION_PIPELINE,
  ACQUISITION_STATUS_LABELS,
  ACQUISITION_STATUS_HELP,
  OPTIONAL_STATUSES,
  STATUS_ENTRY_OPTIONS,
} from "@/lib/enums";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function recordStatus(
  projectId: string,
  status: AcquisitionStatus,
  note: string | null,
  token: string,
) {
  const res = await fetch(`/api/reil/projects/${projectId}/status`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ status, note: note || null }),
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
  return res.json();
}

async function fetchStatusEvents(projectId: string, token: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  return res.json() as Promise<Array<{
    id: string;
    status: AcquisitionStatus;
    note: string | null;
    occurredAt: string;
    recordedBy: { name: string | null; email: string };
  }>>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pipelineIndexOf(s: string) {
  return ACQUISITION_PIPELINE.indexOf(s as AcquisitionStatus);
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusStep({ onNext }: { onNext: () => void }) {
  const { projectId, status, setStatus, setStepDone } = useAcquisitionWizard();
  const { user } = useAuth();
  const qc = useQueryClient();

  const currentStatus = (status.acquisitionStatus as AcquisitionStatus) ?? null;
  const hasEntry = currentStatus !== null;

  const [note,    setNote]    = useState("");
  const [skipPre, setSkipPre] = useState(false);

  // Fetch event history
  const { data: events = [] } = useQuery({
    queryKey:  ["status-events", projectId],
    queryFn:   async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return [];
      return fetchStatusEvents(projectId, token);
    },
    enabled:   !!projectId && !!user,
    staleTime: 10_000,
  });

  // Record status mutation
  const recordMutation = useMutation({
    mutationFn: async (newStatus: AcquisitionStatus) => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Project not saved yet.");
      return recordStatus(projectId, newStatus, note.trim() || null, token);
    },
    onSuccess: (_data, newStatus) => {
      setStatus({ acquisitionStatus: newStatus });
      setNote("");
      qc.invalidateQueries({ queryKey: ["status-events", projectId] });
    },
  });

  const handleEntry = useCallback(
    (s: AcquisitionStatus) => {
      setStatus({ acquisitionStatus: s });
      if (projectId) recordMutation.mutate(s);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatus, projectId],
  );

  const handleAdvance = useCallback(
    (s: AcquisitionStatus) => { recordMutation.mutate(s); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const currentIdx = currentStatus ? pipelineIndexOf(currentStatus) : -1;

  const visiblePipeline = skipPre
    ? ACQUISITION_PIPELINE.filter(s => s !== AcquisitionStatus.PRE_POSSESSION)
    : ACQUISITION_PIPELINE;

  const nextStatus = (() => {
    if (currentIdx < 0 || !currentStatus) return null;
    const vIdx = visiblePipeline.indexOf(currentStatus);
    return visiblePipeline[vIdx + 1] ?? null;
  })();

  return (
    <div className="flex flex-col gap-8 max-w-[600px] w-full mx-auto">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}>
          Where are you with this deal?
        </h2>
        <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
          {hasEntry ? "Advance through stages or jump to any point." : "Pick where you are right now."}
        </p>
      </div>

      {/* Entry chooser */}
      {!hasEntry && (
        <div className="grid grid-cols-2 gap-3">
          {STATUS_ENTRY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleEntry(opt.value)}
              className="flex items-center gap-3 px-4 py-4 rounded-xl text-left"
              style={{ background: "rgba(22,19,24,0.7)", border: "1px solid rgba(255,255,255,0.09)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(69,73,85,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
            >
              <span className="material-symbols-outlined text-[22px] flex-shrink-0" style={{ color: "#454955", fontVariationSettings: "'FILL' 0" }}>
                {opt.icon}
              </span>
              <span className="text-[14px] font-medium" style={{ color: "rgba(253,255,252,0.85)" }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pipeline stepper */}
      {hasEntry && (
        <>
          {/* PRE_POSSESSION toggle */}
          <button
            onClick={() => setSkipPre(v => !v)}
            className="self-start flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-lg"
            style={{
              background: skipPre ? "rgba(255,255,255,0.05)" : "rgba(69,73,85,0.07)",
              border:     `1px solid ${skipPre ? "rgba(255,255,255,0.08)" : "rgba(69,73,85,0.18)"}`,
              color:      skipPre ? "rgba(253,255,252,0.4)" : "#454955",
            }}
          >
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 0" }}>
              {skipPre ? "check_box_outline_blank" : "check_box"}
            </span>
            Include pre-possession
            <span style={{ color: "rgba(253,255,252,0.3)", fontWeight: 400 }}> (optional stage)</span>
          </button>

          {/* Stepper */}
          <div className="space-y-0">
            {visiblePipeline.map((s, idx) => {
              const stepIdx  = pipelineIndexOf(s);
              const isPast   = currentIdx > stepIdx;
              const isCur    = s === currentStatus;
              const isFuture = !isPast && !isCur;
              const isOpt    = OPTIONAL_STATUSES.has(s);
              const isLast   = idx === visiblePipeline.length - 1;

              return (
                <div key={s} className="flex gap-4">
                  {/* Track */}
                  <div className="flex flex-col items-center w-6 flex-shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-3"
                      style={{
                        background: isCur ? "#454955" : isPast ? "rgba(69,73,85,0.18)" : "rgba(255,255,255,0.06)",
                        border: `2px solid ${isCur ? "#454955" : isPast ? "rgba(69,73,85,0.4)" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      {isPast && <span className="material-symbols-outlined text-[11px]" style={{ color: "#454955", fontVariationSettings: "'FILL' 1" }}>check</span>}
                      {isCur  && <span className="w-2 h-2 rounded-full bg-[#0d0a0b]" />}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 mt-1 mb-0" style={{ background: isPast ? "rgba(69,73,85,0.2)" : "rgba(255,255,255,0.06)", minHeight: "16px" }} />
                    )}
                  </div>

                  {/* Label + help */}
                  <div className="py-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: isCur ? "#454955" : isFuture ? "rgba(253,255,252,0.3)" : "rgba(253,255,252,0.8)" }}
                      >
                        {ACQUISITION_STATUS_LABELS[s]}
                      </span>
                      {isOpt && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(253,255,252,0.3)" }}>
                          OPTIONAL
                        </span>
                      )}
                      {isCur && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(69,73,85,0.12)", color: "#454955" }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    {(isCur || isPast) && ACQUISITION_STATUS_HELP[s] && (
                      <p className="text-[12px] leading-relaxed" style={{ color: "rgba(253,255,252,0.38)" }}>
                        {ACQUISITION_STATUS_HELP[s]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advance control */}
          {nextStatus && (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(22,19,24,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "rgba(253,255,252,0.8)" }}>
                Ready to advance to{" "}
                <span style={{ color: "#454955" }}>{ACQUISITION_STATUS_LABELS[nextStatus]}</span>?
              </p>
              <textarea
                rows={2}
                placeholder="Add a note (optional) — e.g. 'Inspection contingency waived'"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm bg-transparent outline-none resize-none"
                style={{ background: "rgba(14,22,28,0.8)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(253,255,252,0.85)" }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdvance(nextStatus)}
                  disabled={recordMutation.isPending || !projectId}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: (recordMutation.isPending || !projectId) ? "rgba(69,73,85,0.1)" : "#454955",
                    color:      (recordMutation.isPending || !projectId) ? "#454955" : "#0d0a0b",
                    opacity:    !projectId ? 0.45 : 1,
                    cursor:     !projectId ? "not-allowed" : "pointer",
                  }}
                >
                  {recordMutation.isPending ? "Recording…" : `Advance to ${ACQUISITION_STATUS_LABELS[nextStatus]}`}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                {!projectId && (
                  <p className="text-[11px]" style={{ color: "rgba(253,255,252,0.3)" }}>
                    Complete the Address step to record events.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Event history */}
          {events.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(253,255,252,0.3)", letterSpacing: "0.08em" }}>
                Status History
              </p>
              <div className="space-y-2">
                {events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(14,22,28,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style={{ color: "#454955", fontVariationSettings: "'FILL' 1" }}>history</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium" style={{ color: "rgba(253,255,252,0.85)" }}>
                        {ACQUISITION_STATUS_LABELS[ev.status as AcquisitionStatus] ?? ev.status}
                      </span>
                      {ev.note && <p className="text-[12px] mt-0.5" style={{ color: "rgba(253,255,252,0.4)" }}>{ev.note}</p>}
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: "rgba(253,255,252,0.25)" }}>{timeAgo(ev.occurredAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Continue / skip */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => { if (hasEntry) setStepDone("status"); onNext(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "#454955", color: "#0d0a0b" }}
        >
          {hasEntry ? "Continue" : "Skip for now"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
