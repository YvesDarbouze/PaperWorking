'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BasecampMiniCalendar from '@/components/projects/basecamp/BasecampMiniCalendar';
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  DownloadSimple,
  ListChecks,
  WarningCircle,
  ArrowLeft,
} from '@/components/icons/PhosphorIcons';
import { ASSIGNED_TASKS } from '@/lib/dashboard/content';
import type {
  EverythingSummary,
  GlobalProjectAssignment,
  GlobalUpcomingDeadline,
} from '@/lib/projects/everything';

const FALLBACK_DEADLINES: GlobalUpcomingDeadline[] = [
  {
    projectId: 'proj-elm-duplex',
    projectName: '1247 Elm Street Duplex',
    event: {
      id: 'ev-inspection-elm',
      title: 'Structural & Roof Inspection Contingency',
      date: '2026-10-22',
      category: 'contingency',
      phase: 'purchase',
      isHardDate: true,
      responsibleParty: 'Apex Structural Engineering',
      notes: 'Earnest money deposit goes hard at 5:00 PM CT.',
    },
  },
  {
    projectId: 'proj-congress-lofts',
    projectName: '400 S Congress Mixed-Use',
    event: {
      id: 'ev-draw-congress',
      title: 'Phase 03 Rehab Draw #2 Inspection',
      date: '2026-10-26',
      category: 'milestone',
      phase: 'hold',
      isHardDate: false,
      responsibleParty: 'Lead Project Manager',
      notes: 'Verify MEP rough-in completion and lien waiver package.',
    },
  },
  {
    projectId: 'proj-oak-quadplex',
    projectName: '812 Oak Ridge Quadplex',
    event: {
      id: 'ev-closing-oak',
      title: 'Senior Debt Term Sheet Rate Lock Expiration',
      date: '2026-10-29',
      category: 'closing',
      phase: 'purchase',
      isHardDate: true,
      responsibleParty: 'Capital Markets Desk',
      notes: 'Confirm appraisal clearance prior to lock window close.',
    },
  },
];

export interface DashboardCalendarPanelProps {
  initialData?: EverythingSummary | null;
  initialLoading?: boolean;
  initialError?: string | null;
}

export default function DashboardCalendarPanel({
  initialData = null,
  initialLoading = true,
  initialError = null,
}: DashboardCalendarPanelProps = {}) {
  const [deadlines, setDeadlines] = useState<GlobalUpcomingDeadline[]>(
    initialData ? initialData.upcomingDeadlines : FALLBACK_DEADLINES,
  );
  const [assignments, setAssignments] = useState<GlobalProjectAssignment[]>(
    initialData ? initialData.assignments : [],
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(initialData ? false : initialLoading);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    if (initialData !== null || initialError !== null) return;
    let active = true;
    async function loadSchedule() {
      try {
        setError(null);
        const res = await fetch('/api/projects/everything', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<EverythingSummary>;
        if (!active) return;
        if (Array.isArray(data.upcomingDeadlines) && data.upcomingDeadlines.length > 0) {
          setDeadlines(data.upcomingDeadlines);
        }
        if (Array.isArray(data.assignments)) {
          setAssignments(data.assignments);
        }
      } catch {
        // Keep seeded portfolio schedule fallback when offline
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSchedule();
    return () => {
      active = false;
    };
  }, [initialData, initialError]);

  const calendarEvents = useMemo(
    () =>
      deadlines.map((d) => ({
        date: d.event.date,
        isHardDate: Boolean(d.event.isHardDate),
        title: `${d.projectName}: ${d.event.title}`,
      })),
    [deadlines],
  );

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((item) => {
      if (selectedDate && !item.event.date.startsWith(selectedDate)) {
        return false;
      }
      if (phaseFilter !== 'all') {
        const rawPhase = (item.event.phase || '').toLowerCase();
        const normalized = rawPhase === 'purchase' ? 'fund' : rawPhase;
        if (normalized !== phaseFilter && rawPhase !== phaseFilter) {
          return false;
        }
      }
      return true;
    });
  }, [deadlines, selectedDate, phaseFilter]);

  const hardDatesCount = useMemo(
    () => deadlines.filter((d) => d.event.isHardDate).length,
    [deadlines],
  );

  const taskItems = useMemo(() => {
    if (assignments.length > 0) {
      return assignments.map((a) => ({
        id: a.task.id,
        title: a.task.title,
        project: a.projectName,
        dueDate: a.task.dueDate || 'Scheduled',
        done: a.task.status === 'complete',
      }));
    }
    if (initialData !== null) {
      return [];
    }
    return ASSIGNED_TASKS.map((t) => ({
      id: t.id,
      title: t.title,
      project: t.project,
      dueDate: 'Active Sprint',
      done: t.done,
    }));
  }, [assignments, initialData]);

  return (
    <div
      data-testid="dashboard-calendar-panel"
      className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 md:px-8"
    >
      {/* Header Bar */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarCheck className="h-4 w-4 text-foreground" />
            <span>REIL Portfolio Schedule &amp; Contingency Calendar</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Portfolio Schedule &amp; Calendar
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Track earnest money hard dates, inspection contingencies, rehab draw milestones, and assigned tasks across all active projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground no-underline transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portfolio</span>
          </Link>
          <Link
            href="/projects"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none bg-primary px-4 py-2 text-xs font-bold text-primary-foreground no-underline transition hover:opacity-90"
          >
            <span>All Projects</span>
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          data-testid="dashboard-calendar-error"
          className="rounded-none border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-none border border-border bg-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Scheduled Milestones
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{deadlines.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Across active REIL phases</p>
        </div>
        <div className="rounded-none border border-border bg-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Hard Contingency Dates
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-destructive">{hardDatesCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">72h / 48h / 24h automated alerts active</p>
        </div>
        <div className="rounded-none border border-border bg-card p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Assigned Action Items
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {taskItems.length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Open operator and team tasks</p>
        </div>
      </div>

      {/* Main Grid: Mini Calendar + Filter Rail (Left) & Upcoming Deadlines / Tasks (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <BasecampMiniCalendar
            events={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={(dateStr) =>
              setSelectedDate((prev) => (prev === dateStr ? '' : dateStr))
            }
          />

          <div className="rounded-none border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Filter by REIL Phase
              </span>
              {(selectedDate || phaseFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setPhaseFilter('all');
                  }}
                  className="min-h-[44px] px-2 text-xs font-semibold text-primary hover:underline sm:min-h-0"
                >
                  Reset filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All Phases' },
                { id: 'acquisition', label: '01 Acquisition' },
                { id: 'fund', label: '02 Fund' },
                { id: 'hold', label: '03 Hold' },
                { id: 'exit', label: '04 Exit' },
              ].map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setPhaseFilter(phase.id)}
                  className={`min-h-[44px] rounded-none border px-3 py-2 text-left text-xs font-semibold transition ${
                    phaseFilter === phase.id
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6 lg:col-span-8">
          {/* Upcoming Deadlines List */}
          <div className="rounded-none border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Upcoming Milestones &amp; Contingency Deadlines
                </h2>
              </div>
              {loading && (
                <span className="font-mono text-[11px] text-muted-foreground">Syncing schedule...</span>
              )}
            </div>

            {filteredDeadlines.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-base font-medium text-foreground">
                  No upcoming deadlines scheduled
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clear the active filter or add contingency dates inside a project workspace.
                </p>
              </div>
            ) : (
              <ul className="space-y-3" data-testid="calendar-deadlines-list">
                {filteredDeadlines.map((item) => (
                  <li
                    key={`${item.projectId}-${item.event.id}`}
                    className="flex flex-col justify-between gap-3 rounded-none border border-border bg-background p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.event.date}
                        </span>
                        {item.event.isHardDate && (
                          <span className="inline-flex items-center gap-1 rounded-none border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-destructive">
                            <WarningCircle className="h-3 w-3" />
                            Hard Date
                          </span>
                        )}
                        {item.event.phase && (
                          <span className="rounded-none border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-foreground">
                            {item.event.phase}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-semibold text-foreground">{item.event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Project: <strong className="text-foreground">{item.projectName}</strong>
                        {item.event.responsibleParty ? ` · Owner: ${item.event.responsibleParty}` : ''}
                      </p>
                      {item.event.notes && (
                        <p className="text-xs text-muted-foreground">{item.event.notes}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <a
                        href={`/api/projects/${encodeURIComponent(item.projectId)}/schedule/export`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground no-underline transition hover:bg-muted"
                        title="Download RFC 5545 iCalendar (.ics)"
                      >
                        <DownloadSimple className="h-3.5 w-3.5" />
                        <span>.ics</span>
                      </a>
                      <Link
                        href={`/project/${encodeURIComponent(item.projectId)}`}
                        className="inline-flex min-h-[44px] items-center rounded-none border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground no-underline transition hover:border-foreground"
                      >
                        Open Project →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assigned Tasks Section */}
          <div className="rounded-none border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Assigned Tasks &amp; Action Items
                </h2>
              </div>
              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                {taskItems.length} OPEN
              </span>
            </div>

            {taskItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No pending tasks assigned across your active projects.
              </div>
            ) : (
              <ul className="space-y-2.5" data-testid="calendar-assigned-tasks-list">
                {taskItems.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-none border border-border bg-background px-4 py-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      {task.done ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <span className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-none border border-border" />
                      )}
                      <div>
                        <p className="text-base font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.project}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none border border-border bg-muted px-2 py-1 font-mono text-[10px] font-semibold text-foreground">
                      {task.dueDate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
