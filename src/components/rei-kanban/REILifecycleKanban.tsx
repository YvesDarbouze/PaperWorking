'use client';

import React, { useState } from 'react';
import { REIPhase } from '@/lib/wizard-engine';
import { Lock, Unlock, Play, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { canAdvancePhase, PHASE_THEME_COLORS, PHASE_ORDER } from '@/lib/phase-engine';
import ExplainerVideoModal from '../phase-panels/ExplainerVideoModal';

interface REILifecycleKanbanProps {
  currentPhase: REIPhase;
  phaseCompletionPct: number;
  activeTodosCount?: Record<REIPhase, number>;
  onSelectPhase?: (phase: REIPhase) => void;
  onForceAdvance?: (targetPhase: REIPhase, reason: string) => void;
}

const PHASE_LABELS: Record<REIPhase, { title: string; videoTitle: string; videoUrl: string }> = {
  acquisition: {
    title: 'Acquisition',
    videoTitle: 'Acquisition & Underwriting Masterclass',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  purchase: {
    title: 'Purchase',
    videoTitle: 'Closing & Loan Processing Guide',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  hold: {
    title: 'Hold',
    videoTitle: 'Rehab Management & Holding Costs',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  exit: {
    title: 'Exit',
    videoTitle: 'Marketing, Sales & 1031 Tax Strategy',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
};

export default function REILifecycleKanban({
  currentPhase,
  phaseCompletionPct,
  activeTodosCount = { acquisition: 4, purchase: 3, hold: 5, exit: 2 },
  onSelectPhase,
  onForceAdvance,
}: REILifecycleKanbanProps) {
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const [overrideModalPhase, setOverrideModalPhase] = useState<REIPhase | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);

  const handlePhaseClick = (phase: REIPhase, index: number) => {
    const isLocked = index > currentPhaseIndex && phaseCompletionPct < 100;

    if (isLocked) {
      setOverrideModalPhase(phase);
      setOverrideReason('');
      setOverrideError(null);
      return;
    }

    if (onSelectPhase) onSelectPhase(phase);
    const element = document.getElementById(`${phase}-panel`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleConfirmOverride = () => {
    if (!overrideModalPhase) return;

    if (!overrideReason || overrideReason.trim().length < 5) {
      setOverrideError('A detailed reason (minimum 5 characters) is required for governance audit logging.');
      return;
    }

    if (onForceAdvance) {
      onForceAdvance(overrideModalPhase, overrideReason);
    }

    if (onSelectPhase) onSelectPhase(overrideModalPhase);

    setOverrideModalPhase(null);
    setOverrideReason('');

    const element = document.getElementById(`${overrideModalPhase}-panel`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div data-testid="rei-lifecycle-kanban" className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          REI Lifecycle Kanban Menu
        </h3>
        <span className="text-xs text-slate-400">
          Active Phase: <strong className="text-white capitalize">{currentPhase}</strong> ({phaseCompletionPct}% Done)
        </span>
      </div>

      {/* 4 Column Kanban Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PHASE_ORDER.map((phase, idx) => {
          const isCurrent = phase === currentPhase;
          const isCompleted = idx < currentPhaseIndex || (isCurrent && phaseCompletionPct === 100);
          const isLocked = idx > currentPhaseIndex && phaseCompletionPct < 100;

          const meta = PHASE_LABELS[phase];
          const colorHex = PHASE_THEME_COLORS[phase];
          const todosCount = activeTodosCount[phase] || 0;

          return (
            <div
              key={phase}
              data-testid={`kanban-column-${phase}`}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isCurrent
                  ? 'border-white/40 shadow-xl ring-2 ring-emerald-400/40'
                  : isLocked
                  ? 'bg-black/40 border-white/5 opacity-70'
                  : 'bg-black/30 border-white/10 hover:border-white/20'
              }`}
              style={{
                backgroundColor: isCurrent ? `${colorHex}dd` : undefined,
              }}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">{meta.title}</span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-400 text-slate-950">
                      Active
                    </span>
                  )}
                </div>

                {isLocked ? (
                  <Lock data-testid={`lock-icon-${phase}`} className="w-4 h-4 text-slate-500" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-white/50" />
                )}
              </div>

              {/* Progress & Todos */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-200 font-medium">
                  <span>{isCurrent ? `${phaseCompletionPct}% Complete` : isCompleted ? '100% Complete' : 'Pending'}</span>
                  <span>{todosCount} Todos</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{
                      width: `${isCurrent ? phaseCompletionPct : isCompleted ? 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Video Thumbnail Button & Jump Action */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveVideo({ title: meta.videoTitle, url: meta.videoUrl })}
                  data-testid={`video-thumb-btn-${phase}`}
                  className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-emerald-300 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  <span>Explainer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePhaseClick(phase, idx)}
                  data-testid={`jump-phase-btn-${phase}`}
                  className="flex items-center gap-1 text-xs font-semibold text-white hover:underline"
                >
                  <span>{isLocked ? 'Override' : 'View'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Force Advance Governance Modal */}
      {overrideModalPhase && (
        <div data-testid="governance-override-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Governance Phase Override</h3>
            </div>

            <p className="text-xs text-slate-300">
              Phase <strong>{overrideModalPhase.toUpperCase()}</strong> is currently locked because <strong>{currentPhase.toUpperCase()}</strong> has not reached 100% completion.
              To force advance, enter a mandatory explanation note for the team audit log.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Explanation Note (Audit Trail)</label>
              <textarea
                data-testid="override-reason-input"
                rows={3}
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for overriding phase locks..."
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {overrideError && (
              <p className="text-xs text-red-400 font-medium">{overrideError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setOverrideModalPhase(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                data-testid="confirm-override-btn"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Log & Force Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explainer Video Modal */}
      {activeVideo && (
        <ExplainerVideoModal
          isOpen={Boolean(activeVideo)}
          onClose={() => setActiveVideo(null)}
          title={activeVideo.title}
          videoUrl={activeVideo.url}
        />
      )}
    </div>
  );
}
