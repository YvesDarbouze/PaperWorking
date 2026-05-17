'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

// ── Calendar event derived from real project date fields ─────────────────────
interface CalendarEvent {
  day: number;   // 1-indexed day of month
  label: string;
  color: string; // CSS color token
}

// Days-of-week header labels
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Month display name helper
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarTodo() {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'TODOS'>('TODOS');
  const currentProject = useProjectStore(state => state.currentProject);

  // ── Calendar navigation state (defaults to current month) ─────────────────
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // ── Derive calendar events from real project milestone dates ───────────────
  const calendarEvents = useMemo((): CalendarEvent[] => {
    if (!currentProject) return [];
    const f = currentProject.financials;
    const events: CalendarEvent[] = [];

    function maybeAdd(raw: Date | string | undefined, label: string, color: string) {
      if (!raw) return;
      const d = raw instanceof Date ? raw : new Date(raw as string);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        events.push({ day: d.getDate(), label, color });
      }
    }

    maybeAdd(f?.acquisitionDate,  'Closing / Acquisition', 'var(--pw-accent)');
    maybeAdd(f?.emdGoHardDate,    'EMD Go-Hard',           '#F59E0B');
    maybeAdd(f?.emdClearedDate,   'EMD Cleared',           '#10B981');
    maybeAdd(f?.listingDate,      'Listing Date',          '#6366F1');
    maybeAdd(f?.soldDate,         'Sold Date',             '#EF4444');

    return events;
  }, [currentProject, calYear, calMonth]);

  // ── Build a lookup: day → events[] ────────────────────────────────────────
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    calendarEvents.forEach(ev => {
      if (!map.has(ev.day)) map.set(ev.day, []);
      map.get(ev.day)!.push(ev);
    });
    return map;
  }, [calendarEvents]);

  // ── Grid geometry ──────────────────────────────────────────────────────────
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDOW    = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun

  // ── Tactical to-dos from real project data ─────────────────────────────────
  const todos = useMemo(() => {
    if (!currentProject) return [];

    const combined: {
      id: string;
      task: string;
      priority: 'High' | 'Medium' | 'Low';
      dueDate: string;
      type: string;
    }[] = [];

    // Rehab Tasks — correct path: financials.rehabTasks (not rehab.tasks)
    const rehabTasks = currentProject.financials?.rehabTasks || [];
    rehabTasks.forEach(task => {
      if (task.status !== 'Complete') {
        combined.push({
          id: task.id,
          task: task.title,
          priority: task.status === 'In Progress' ? 'High' : 'Medium',
          dueDate: 'Ongoing',
          type: `Rehab · ${task.category}`,
        });
      }
    });

    // Closing Checklist
    const closingChecklist = currentProject.closingChecklist || [];
    closingChecklist.forEach(item => {
      if (!item.completed) {
        combined.push({
          id: item.id,
          task: item.type,
          priority: 'High',
          dueDate: 'Pending',
          type: 'Closing',
        });
      }
    });

    // Due Diligence
    const dueDiligence = currentProject.dueDiligenceChecklist || [];
    dueDiligence.forEach(item => {
      if (!item.completed) {
        combined.push({
          id: item.id,
          task: item.label,
          priority: 'High',
          dueDate: 'Pending',
          type: 'Due Diligence',
        });
      }
    });

    // Purchase Readiness
    const purchaseReadiness = currentProject.purchaseReadinessChecklist || [];
    purchaseReadiness.forEach(item => {
      if (!item.completed) {
        combined.push({
          id: item.id,
          task: item.type,
          priority: 'High',
          dueDate: 'Pending',
          type: 'Purchase Readiness',
        });
      }
    });

    return combined;
  }, [currentProject]);

  return (
    <div className="flex flex-col h-full bg-bg-surface border border-border-accent overflow-hidden">
      <header className="p-6 border-b border-border-accent flex justify-between items-center bg-bg-primary">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('TODOS')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'TODOS' ? 'text-text-primary border-b-2 border-pw-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Tactical To-Dos
          </button>
          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'CALENDAR' ? 'text-text-primary border-b-2 border-pw-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Asset Timeline
          </button>
        </div>
        <button className="p-2 bg-pw-black text-pw-white hover:bg-pw-accent transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'TODOS' ? (
          <div className="space-y-4">
            {todos.length === 0 ? (
              <div className="p-6 text-center text-text-secondary text-sm font-mono border border-dashed border-border-accent bg-bg-primary">
                {currentProject ? 'All tasks completed' : 'Select a project to view tasks'}
              </div>
            ) : (
              todos.map((todo) => (
                <div key={todo.id} className="group p-4 bg-bg-primary border border-border-accent flex items-center gap-4 hover:border-border-accent transition-all">
                  <button className="w-5 h-5 border-2 border-pw-muted rounded-none group-hover:border-pw-accent transition-all" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-text-primary uppercase tracking-tight">{todo.task}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-secondary opacity-60">{todo.type}</span>
                      <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${todo.priority === 'High' ? 'text-[#595959]' : 'text-text-secondary'}`}>{todo.priority}</span>
                      <span className="text-[10px] text-text-secondary font-mono flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {todo.dueDate}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* ── Month navigation ── */}
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">
                {MONTH_NAMES[calMonth]} {calYear}
              </h4>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1 hover:bg-bg-primary transition-all" aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-1 hover:bg-bg-primary transition-all" aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Legend (only shown when project has events in this month) ── */}
            {currentProject && calendarEvents.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                {calendarEvents.map((ev, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-text-secondary">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: ev.color }} />
                    {ev.label}
                  </span>
                ))}
              </div>
            )}

            {/* ── Day-of-week headers ── */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DOW.map((d, i) => (
                <div key={`dow-${i}`} className="text-center text-[10px] font-black text-text-secondary uppercase py-1">{d}</div>
              ))}
            </div>

            {/* ── Calendar grid ── */}
            <div className="grid grid-cols-7 gap-px bg-[#F2F2F2] border border-border-accent flex-1 min-h-[300px]">
              {/* Leading blank cells to align day 1 with correct DOW */}
              {Array.from({ length: firstDOW }).map((_, i) => (
                <div key={`blank-${i}`} className="bg-bg-surface" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday =
                  calYear === now.getFullYear() &&
                  calMonth === now.getMonth() &&
                  day === now.getDate();
                const dayEvents = eventsByDay.get(day) || [];

                return (
                  <div
                    key={day}
                    className="bg-bg-surface p-2 min-h-[60px] relative group hover:bg-bg-primary transition-all"
                  >
                    <span
                      className={`text-[10px] font-mono ${
                        isToday
                          ? 'bg-pw-black text-pw-white px-1 rounded-sm font-black'
                          : 'text-text-secondary'
                      }`}
                    >
                      {day}
                    </span>
                    {/* Real milestone event bars */}
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.map((ev, ei) => (
                        <div
                          key={ei}
                          className="w-full h-1 rounded-sm"
                          style={{ background: ev.color }}
                          title={ev.label}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {!currentProject && (
              <p className="mt-4 text-center text-[10px] font-mono text-text-secondary">
                Select a project to see milestone dates
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
