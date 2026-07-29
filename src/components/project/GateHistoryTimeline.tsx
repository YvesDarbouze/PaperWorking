'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getProjectGateEvents } from '@/actions/gate';
import type { PhaseGateEventRecord } from '@/lib/db/gateEventsStore';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  History,
  Sparkles,
} from 'lucide-react';

interface GateHistoryTimelineProps {
  projectId: string;
}

export function GateHistoryTimeline({ projectId }: GateHistoryTimelineProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<PhaseGateEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    try {
      const idToken = user ? await user.getIdToken() : '';
      const list = await getProjectGateEvents(idToken, projectId);
      setEvents(list || []);
    } catch (err) {
      console.error('[GateHistoryTimeline] Error fetching gate events:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleExpand = (eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  };

  const formatPhaseLabel = (phaseStr: string) => {
    if (phaseStr === '1' || phaseStr === 'phase-1') return 'Phase 1: Acquisition';
    if (phaseStr === '2' || phaseStr === 'phase-2') return 'Phase 2: Fund';
    if (phaseStr === '3' || phaseStr === 'phase-3') return 'Phase 3: Hold';
    if (phaseStr === '4' || phaseStr === 'phase-4') return 'Phase 4: Exit';
    return phaseStr;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      id="gate_history_timeline"
      className="glass-card rounded-2xl border border-pw-border p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
            Gate History & Audit Trail
          </h3>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Chronological audit trail of phase gate evaluations, criteria snapshots, and override decisions.
          </p>
        </div>
        {!loading && (
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-pw-border text-[var(--color-muted)]">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4 py-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-pw-border bg-white/5 space-y-3">
              <div className="h-4 w-1/3 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-pw-border bg-white/5 text-center space-y-2">
          <History className="w-8 h-8 text-[var(--color-muted)] mx-auto opacity-40" />
          <p className="text-sm font-semibold text-[var(--color-on-surface)]">No gate activity yet</p>
          <p className="text-xs text-[var(--color-muted)]">
            Events will be recorded here automatically whenever a phase gate decision is made.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = expandedEventId === event.id;
            const passedCount = (event.criteriaSnapshot || []).filter((c) => c.status).length;
            const totalCount = (event.criteriaSnapshot || []).length;
            const isOverride = !!event.overrideReason;

            return (
              <div
                key={event.id}
                className="p-4 rounded-xl border border-pw-border bg-white/5 space-y-3 transition-all hover:bg-white/[0.07]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isOverride
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-[var(--pw-success-container)] text-[var(--pw-success)]'
                      }`}
                    >
                      {isOverride ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-on-surface)]">
                          {formatPhaseLabel(event.fromPhase)} → {formatPhaseLabel(event.toPhase)}
                        </span>
                        {isOverride && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                            OVERRIDE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)] mt-0.5">
                        <User className="w-3 h-3" />
                        <span>
                          {event.actorName || event.actorEmail || event.actorId}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-semibold text-[var(--color-on-surface)]">
                          {event.actorRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-muted)]">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(event.createdAt)}
                    </div>
                    <button
                      onClick={() => toggleExpand(event.id)}
                      className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline font-bold px-2 py-1 rounded bg-white/5 border border-pw-border"
                    >
                      <span>Snapshot ({passedCount}/{totalCount})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isOverride && event.overrideReason && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-400 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Override Reason:
                    </div>
                    <p className="italic leading-relaxed">{event.overrideReason}</p>
                  </div>
                )}

                {isExpanded && (
                  <div className="pt-3 border-t border-pw-border space-y-2 animate-fade-in">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Criteria Snapshot at Decision Time:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(event.criteriaSnapshot || []).map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center gap-2 p-2 rounded-lg bg-black/20 text-xs border border-pw-border"
                        >
                          {c.status ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--pw-success)] shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className={c.status ? 'text-[var(--color-on-surface)]' : 'text-red-300 font-semibold'}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
