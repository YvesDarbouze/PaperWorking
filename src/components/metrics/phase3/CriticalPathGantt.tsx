'use client';

import { useState, useMemo, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { RehabScheduleTask, RehabTrade, RehabStage } from '@/types/schema';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  GitBranch,
  CheckCircle2,
  Clock,
  Loader2,
  Ban,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Critical Path Gantt — Hold Phase (Phase 3)

   A horizontal Gantt-style scheduler for rehab tasks.
   Tasks are grouped by trade, with dependency tracking
   and automated Critical Path Method (CPM) computation.

   The longest chain of dependent tasks determines the
   project's minimum duration. Delays on the critical
   path delay the whole project.
   ═══════════════════════════════════════════════════════ */

const TRADES: RehabTrade[] = [
  'Demo', 'Framing', 'Plumbing', 'Electrical', 'HVAC',
  'Insulation', 'Drywall', 'Painting', 'Flooring',
  'Cabinets', 'Tile', 'Roofing', 'Exterior', 'Landscaping',
  'Final Inspection',
];

const STAGES: RehabStage[] = ['Pre-Construction', 'Active Renovation', 'Punch List'];

const STATUS_META: Record<RehabScheduleTask['status'], {
  icon: React.ReactNode;
  color: string;
  label: string;
}> = {
  'Not Started': { icon: <Clock className="w-3 h-3" />, color: 'text-text-secondary', label: 'Not Started' },
  'In Progress': { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-amber-600', label: 'Active' },
  'Complete': { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-700', label: 'Done' },
  'Blocked': { icon: <Ban className="w-3 h-3" />, color: 'text-red-600', label: 'Blocked' },
};

// Default task template for new projects
const DEFAULT_TASKS: RehabScheduleTask[] = [
  { id: 'rs-1', title: 'Permit Applications', trade: 'Demo', phase: 'Pre-Construction', startDay: 1, durationDays: 14, dependsOn: [], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-2', title: 'Demolition', trade: 'Demo', phase: 'Pre-Construction', startDay: 15, durationDays: 5, dependsOn: ['rs-1'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-3', title: 'Rough Framing', trade: 'Framing', phase: 'Active Renovation', startDay: 20, durationDays: 10, dependsOn: ['rs-2'], status: 'Not Started', inspectionRequired: true },
  { id: 'rs-4', title: 'Rough Plumbing', trade: 'Plumbing', phase: 'Active Renovation', startDay: 30, durationDays: 7, dependsOn: ['rs-3'], status: 'Not Started', inspectionRequired: true },
  { id: 'rs-5', title: 'Rough Electrical', trade: 'Electrical', phase: 'Active Renovation', startDay: 30, durationDays: 7, dependsOn: ['rs-3'], status: 'Not Started', inspectionRequired: true },
  { id: 'rs-6', title: 'HVAC Rough-In', trade: 'HVAC', phase: 'Active Renovation', startDay: 30, durationDays: 5, dependsOn: ['rs-3'], status: 'Not Started', inspectionRequired: true },
  { id: 'rs-7', title: 'Insulation', trade: 'Insulation', phase: 'Active Renovation', startDay: 37, durationDays: 3, dependsOn: ['rs-4', 'rs-5', 'rs-6'], status: 'Not Started', inspectionRequired: true },
  { id: 'rs-8', title: 'Drywall Hang & Finish', trade: 'Drywall', phase: 'Active Renovation', startDay: 40, durationDays: 10, dependsOn: ['rs-7'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-9', title: 'Cabinet Install', trade: 'Cabinets', phase: 'Active Renovation', startDay: 50, durationDays: 5, dependsOn: ['rs-8'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-10', title: 'Tile Work', trade: 'Tile', phase: 'Active Renovation', startDay: 50, durationDays: 7, dependsOn: ['rs-8'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-11', title: 'Interior Paint', trade: 'Painting', phase: 'Active Renovation', startDay: 55, durationDays: 7, dependsOn: ['rs-8'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-12', title: 'Flooring Install', trade: 'Flooring', phase: 'Punch List', startDay: 62, durationDays: 5, dependsOn: ['rs-9', 'rs-11'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-13', title: 'Final Trim & Fixtures', trade: 'Electrical', phase: 'Punch List', startDay: 67, durationDays: 3, dependsOn: ['rs-12'], status: 'Not Started', inspectionRequired: false },
  { id: 'rs-14', title: 'Final Inspection', trade: 'Final Inspection', phase: 'Punch List', startDay: 70, durationDays: 2, dependsOn: ['rs-12', 'rs-13'], status: 'Not Started', inspectionRequired: true },
];

// ── Critical Path Computation ──

function computeCriticalPath(tasks: RehabScheduleTask[]): Set<string> {
  if (tasks.length === 0) return new Set();

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Forward pass: compute earliest start/finish
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  function getEarlyFinish(id: string): number {
    if (earlyFinish.has(id)) return earlyFinish.get(id)!;
    const task = taskMap.get(id);
    if (!task) return 0;

    const es = task.dependsOn.length > 0
      ? Math.max(...task.dependsOn.map(dep => getEarlyFinish(dep)))
      : task.startDay;

    earlyStart.set(id, es);
    earlyFinish.set(id, es + task.durationDays);
    return es + task.durationDays;
  }

  tasks.forEach(t => getEarlyFinish(t.id));

  // Project duration
  const projectDuration = Math.max(...Array.from(earlyFinish.values()));

  // Backward pass: compute latest start/finish
  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();

  // Find tasks with no successors
  const successorMap = new Map<string, string[]>();
  tasks.forEach(t => {
    t.dependsOn.forEach(dep => {
      if (!successorMap.has(dep)) successorMap.set(dep, []);
      successorMap.get(dep)!.push(t.id);
    });
  });

  function getLatestStart(id: string): number {
    if (lateStart.has(id)) return lateStart.get(id)!;
    const task = taskMap.get(id);
    if (!task) return projectDuration;

    const successors = successorMap.get(id) ?? [];
    const lf = successors.length > 0
      ? Math.min(...successors.map(sId => getLatestStart(sId)))
      : projectDuration;

    lateFinish.set(id, lf);
    lateStart.set(id, lf - task.durationDays);
    return lf - task.durationDays;
  }

  tasks.forEach(t => getLatestStart(t.id));

  // Critical path = tasks where float (latest start - earliest start) = 0
  const criticalTasks = new Set<string>();
  tasks.forEach(t => {
    const es = earlyStart.get(t.id) ?? 0;
    const ls = lateStart.get(t.id) ?? 0;
    const float = ls - es;
    if (float <= 0) criticalTasks.add(t.id);
  });

  return criticalTasks;
}

export default function CriticalPathGantt() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateRehabSchedule = useProjectStore(s => s.updateRehabScheduleTasks);
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tasks = currentProject?.rehabScheduleTasks ?? [];
  const hasCustomTasks = tasks.length > 0;

  const criticalPath = useMemo(() => computeCriticalPath(tasks), [tasks]);

  // Timeline bounds
  const maxDay = useMemo(() => {
    if (tasks.length === 0) return 90;
    return Math.max(...tasks.map(t => t.startDay + t.durationDays)) + 5;
  }, [tasks]);

  // Elapsed days for "today" marker
  const acquisitionDate = currentProject?.financials?.acquisitionDate
    ? new Date(currentProject.financials.acquisitionDate)
    : currentProject?.holdingCostClockStart
      ? new Date(currentProject.holdingCostClockStart)
      : null;

  const todayDay = acquisitionDate
    ? Math.max(0, Math.floor((Date.now() - acquisitionDate.getTime()) / 86_400_000))
    : 0;

  // Persist
  const persist = useCallback((next: RehabScheduleTask[]) => {
    if (!currentProject?.id || !updateRehabSchedule) return;
    updateRehabSchedule(currentProject.id, next);
  }, [currentProject?.id, updateRehabSchedule]);

  const loadDefaults = () => {
    persist(DEFAULT_TASKS.map(t => ({ ...t })));
  };

  const addTask = () => {
    const newTask: RehabScheduleTask = {
      id: `rs-${Date.now()}`,
      title: 'New Task',
      trade: 'Demo',
      phase: 'Pre-Construction',
      startDay: 1,
      durationDays: 5,
      dependsOn: [],
      status: 'Not Started',
      inspectionRequired: false,
    };
    persist([...tasks, newTask]);
    setEditingId(newTask.id);
  };

  const removeTask = (id: string) => {
    // Also remove as dependency from other tasks
    const cleaned = tasks
      .filter(t => t.id !== id)
      .map(t => ({
        ...t,
        dependsOn: t.dependsOn.filter(dep => dep !== id),
      }));
    persist(cleaned);
    if (editingId === id) setEditingId(null);
  };

  const updateTask = (id: string, patch: Partial<RehabScheduleTask>) => {
    persist(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const cycleStatus = (id: string) => {
    const order: RehabScheduleTask['status'][] = ['Not Started', 'In Progress', 'Complete', 'Blocked'];
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    updateTask(id, { status: next });
  };

  if (!currentProject) return null;

  return (
    <div className="bg-bg-surface border border-border-accent overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-primary transition"
      >
        <div className="flex items-center gap-2 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          <GitBranch className="w-4 h-4 text-text-secondary" />
          <div>
            <h3 className="text-[9px] font-black text-text-primary uppercase tracking-[0.25em]">
              Critical Path Schedule
            </h3>
            <p className="text-[9px] text-text-secondary mt-0.5">
              {hasCustomTasks
                ? `${tasks.length} tasks · ${criticalPath.size} on critical path · ${maxDay} day timeline`
                : 'No tasks scheduled'
              }
            </p>
          </div>
        </div>
        {criticalPath.size > 0 && (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
              {criticalPath.size} Critical
            </span>
          </div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {!hasCustomTasks ? (
              <div className="px-6 pb-6">
                <div className="border border-dashed border-border-accent p-8 text-center space-y-3">
                  <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-[0.3em]">
                    No rehab schedule created yet
                  </p>
                  <button
                    onClick={loadDefaults}
                    className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-pw-black text-white hover:bg-gray-800 transition"
                  >
                    Load Standard Flip Template
                  </button>
                  <p className="text-[9px] text-text-secondary">
                    14-task template: Demo → Framing → MEP → Drywall → Finishes → Inspection
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-4">

                {/* Gantt Chart */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Day scale header */}
                    <div className="flex items-end mb-1 ml-[180px]">
                      {Array.from({ length: Math.ceil(maxDay / 10) + 1 }, (_, i) => i * 10).map(d => (
                        <div
                          key={d}
                          className="text-[8px] font-black text-text-secondary tabular-nums"
                          style={{
                            position: 'absolute',
                            left: `${180 + (d / maxDay) * (600 - 180)}px`,
                          }}
                        >
                          {d > 0 ? `Day ${d}` : ''}
                        </div>
                      ))}
                    </div>

                    {/* Task rows */}
                    {tasks.map(task => {
                      const isCritical = criticalPath.has(task.id);
                      const leftPct = (task.startDay / maxDay) * 100;
                      const widthPct = (task.durationDays / maxDay) * 100;
                      const statusMeta = STATUS_META[task.status];
                      const isEditing = editingId === task.id;

                      return (
                        <div key={task.id} className="group">
                          <div className="flex items-center h-8 gap-0 hover:bg-bg-primary/50 transition">
                            {/* Task label */}
                            <div className="w-[180px] flex-shrink-0 flex items-center gap-1.5 px-2 overflow-hidden">
                              <button
                                onClick={() => cycleStatus(task.id)}
                                className={`flex-shrink-0 ${statusMeta.color}`}
                                title={`Status: ${statusMeta.label}. Click to cycle.`}
                              >
                                {statusMeta.icon}
                              </button>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={e => updateTask(task.id, { title: e.target.value })}
                                  onBlur={() => setEditingId(null)}
                                  onKeyDown={e => { if (e.key === 'Enter') setEditingId(null); }}
                                  autoFocus
                                  className="text-[10px] font-bold text-text-primary bg-transparent outline-none border-b border-pw-black w-full"
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingId(task.id)}
                                  className={`text-[10px] font-bold truncate text-left ${
                                    isCritical ? 'text-red-700' : 'text-text-primary'
                                  }`}
                                >
                                  {task.title}
                                </button>
                              )}
                              {task.inspectionRequired && (
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                              )}
                            </div>

                            {/* Bar area */}
                            <div className="flex-1 relative h-full">
                              {/* Bar */}
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPct}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className={`absolute top-1 bottom-1 rounded-sm ${
                                  task.status === 'Complete'
                                    ? 'bg-green-700'
                                    : isCritical
                                      ? 'bg-red-600'
                                      : task.status === 'Blocked'
                                        ? 'bg-red-300'
                                        : task.status === 'In Progress'
                                          ? 'bg-amber-500'
                                          : 'bg-gray-300'
                                }`}
                                style={{ left: `${leftPct}%` }}
                              >
                                <span className="text-[7px] font-black text-white px-1 truncate block leading-[22px]">
                                  {task.durationDays}d
                                </span>
                              </motion.div>

                              {/* Today marker */}
                              {todayDay > 0 && todayDay < maxDay && (
                                <div
                                  className="absolute top-0 bottom-0 w-px bg-red-500/50"
                                  style={{ left: `${(todayDay / maxDay) * 100}%` }}
                                />
                              )}
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => removeTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-300 hover:text-red-500 flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Inline editor (trade, phase, timing) */}
                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden ml-[180px] border-l-2 border-pw-black pl-3 pb-2 space-y-2"
                            >
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-0.5">Trade</label>
                                  <select
                                    value={task.trade}
                                    onChange={e => updateTask(task.id, { trade: e.target.value as RehabTrade })}
                                    className="w-full text-[10px] bg-bg-primary border border-border-accent px-2 py-1 outline-none"
                                  >
                                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-0.5">Stage</label>
                                  <select
                                    value={task.phase}
                                    onChange={e => updateTask(task.id, { phase: e.target.value as RehabStage })}
                                    className="w-full text-[10px] bg-bg-primary border border-border-accent px-2 py-1 outline-none"
                                  >
                                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-0.5">Start Day</label>
                                  <input
                                    type="number"
                                    value={task.startDay}
                                    onChange={e => updateTask(task.id, { startDay: parseInt(e.target.value) || 1 })}
                                    className="w-full text-[10px] bg-bg-primary border border-border-accent px-2 py-1 outline-none tabular-nums"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-0.5">Duration</label>
                                  <input
                                    type="number"
                                    value={task.durationDays}
                                    onChange={e => updateTask(task.id, { durationDays: parseInt(e.target.value) || 1 })}
                                    className="w-full text-[10px] bg-bg-primary border border-border-accent px-2 py-1 outline-none tabular-nums"
                                    min={1}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={task.inspectionRequired ?? false}
                                    onChange={e => updateTask(task.id, { inspectionRequired: e.target.checked })}
                                    className="w-3 h-3"
                                  />
                                  <span className="text-[9px] font-bold text-text-secondary">Requires Inspection</span>
                                </label>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add task */}
                    <button
                      onClick={addTask}
                      className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border-accent text-xs text-text-secondary hover:bg-bg-primary transition mt-2"
                    >
                      <Plus className="w-3 h-3" /> Add Task
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border-accent">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-red-600 rounded-sm" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Critical Path</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-gray-300 rounded-sm" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Non-Critical</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-green-700 rounded-sm" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Complete</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-amber-500 rounded-sm" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Inspection Req.</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
