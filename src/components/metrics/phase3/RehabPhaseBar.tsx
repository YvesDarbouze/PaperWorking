'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import type { RehabScheduleTask, RehabStage } from '@/types/schema';
import { HardHat, Hammer, ClipboardCheck } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Rehab Phase Bar — 3-Stage Renovation Lifecycle

   Pre-Construction → Active Renovation → Punch List & Final

   A compact horizontal bar showing which stage the
   renovation is in, with completion progress per stage
   and milestone markers at stage boundaries.
   ═══════════════════════════════════════════════════════ */

const STAGE_META: Record<RehabStage, {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  milestone: string;
}> = {
  'Pre-Construction': {
    label: 'Pre-Construction',
    shortLabel: 'Pre-Con',
    icon: <HardHat className="w-3 h-3" />,
    milestone: 'Permits Approved',
  },
  'Active Renovation': {
    label: 'Active Renovation',
    shortLabel: 'Active',
    icon: <Hammer className="w-3 h-3" />,
    milestone: 'Rough Inspections Clear',
  },
  'Punch List': {
    label: 'Punch List & Final',
    shortLabel: 'Punch',
    icon: <ClipboardCheck className="w-3 h-3" />,
    milestone: 'Final Walkthrough',
  },
};

const STAGES: RehabStage[] = ['Pre-Construction', 'Active Renovation', 'Punch List'];

interface StageData {
  stage: RehabStage;
  totalTasks: number;
  completeTasks: number;
  totalDays: number;
  progress: number;
}

function computeStageData(tasks: RehabScheduleTask[]): StageData[] {
  return STAGES.map(stage => {
    const stageTasks = tasks.filter(t => t.phase === stage);
    const completeTasks = stageTasks.filter(t => t.status === 'Complete').length;
    const totalDays = stageTasks.reduce((s, t) => s + t.durationDays, 0);
    const progress = stageTasks.length > 0 ? completeTasks / stageTasks.length : 0;

    return {
      stage,
      totalTasks: stageTasks.length,
      completeTasks,
      totalDays: Math.max(totalDays, 1),
      progress,
    };
  });
}

function findActiveStage(stages: StageData[]): RehabStage {
  for (const s of stages) {
    if (s.progress < 1 && s.totalTasks > 0) return s.stage;
  }
  // All complete or no tasks
  return stages.every(s => s.totalTasks === 0) ? 'Pre-Construction' : 'Punch List';
}

export default function RehabPhaseBar() {
  const currentProject = useProjectStore(s => s.currentProject);
  const tasks = currentProject?.rehabScheduleTasks ?? [];

  const stageData = useMemo(() => computeStageData(tasks), [tasks]);
  const activeStage = useMemo(() => findActiveStage(stageData), [stageData]);
  const totalDays = useMemo(
    () => stageData.reduce((s, d) => s + d.totalDays, 0),
    [stageData]
  );

  const hasTasks = tasks.length > 0;

  if (!currentProject) return null;

  return (
    <div className="bg-bg-surface border border-border-accent p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.3em]">
            Renovation Lifecycle
          </p>
          {hasTasks && (
            <p className="text-[10px] text-text-secondary mt-0.5">
              {tasks.filter(t => t.status === 'Complete').length} of {tasks.length} tasks complete
            </p>
          )}
        </div>
        {hasTasks && (
          <p className="text-[9px] font-black text-text-primary uppercase tracking-widest">
            {STAGE_META[activeStage].label}
          </p>
        )}
      </div>

      {!hasTasks ? (
        <div className="flex items-center justify-center py-4 border border-dashed border-border-accent">
          <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-[0.3em]">
            Add schedule tasks to see renovation stages
          </p>
        </div>
      ) : (
        <>
          {/* Segmented bar */}
          <div className="flex h-8 overflow-hidden bg-bg-primary">
            {stageData.map((s, i) => {
              const widthPct = (s.totalDays / totalDays) * 100;
              const isActive = s.stage === activeStage;
              const isComplete = s.progress >= 1;

              return (
                <div
                  key={s.stage}
                  className={`relative flex items-center justify-center overflow-hidden transition-all ${
                    i < stageData.length - 1 ? 'border-r border-bg-surface' : ''
                  }`}
                  style={{ width: `${widthPct}%` }}
                >
                  {/* Fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.progress * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.15 }}
                    className={`absolute inset-y-0 left-0 ${
                      isComplete
                        ? 'bg-pw-black'
                        : isActive
                          ? 'bg-pw-black/70'
                          : 'bg-[#CCCCCC]'
                    }`}
                  />
                  {/* Label */}
                  <div className="relative z-10 flex items-center gap-1">
                    <span className={`${
                      s.progress > 0.4 ? 'text-white' : 'text-text-secondary'
                    }`}>
                      {STAGE_META[s.stage].icon}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-widest hidden sm:inline ${
                      s.progress > 0.4 ? 'text-white' : 'text-text-secondary'
                    }`}>
                      {STAGE_META[s.stage].shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stage details row */}
          <div className="grid grid-cols-3 gap-2">
            {stageData.map(s => {
              const isActive = s.stage === activeStage;
              return (
                <div
                  key={s.stage}
                  className={`px-3 py-2 text-center transition-colors ${
                    isActive
                      ? 'bg-bg-primary border border-pw-border'
                      : 'border border-border-accent'
                  }`}
                >
                  <p className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-0.5">
                    {STAGE_META[s.stage].shortLabel}
                  </p>
                  <p className="text-[10px] font-black text-text-primary tabular-nums">
                    {s.completeTasks}/{s.totalTasks}
                  </p>
                  <p className="text-[8px] text-text-secondary">
                    {STAGE_META[s.stage].milestone}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
