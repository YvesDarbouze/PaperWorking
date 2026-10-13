'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClockCounterClockwise,
  CheckSquare,
  CalendarCheck,
  Building,
  CaretRight,
  Clock,
  ArrowRight,
  WarningCircle,
} from '@phosphor-icons/react';
import type {
  EverythingSummary,
  GlobalProjectActivity,
  GlobalProjectAssignment,
  GlobalUpcomingDeadline,
} from '@/lib/projects/everything';

type SubTab = 'activity' | 'assignments' | 'deadlines';

export default function ProjectEverythingView() {
  const [data, setData] = useState<EverythingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>('activity');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEverything() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/projects/everything');
        if (!res.ok) {
          throw new Error('Failed to load portfolio activity');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portfolio activity');
      } finally {
        setLoading(false);
      }
    }
    loadEverything();
  }, []);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise size={20} className="text-foreground shrink-0" />
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Portfolio Everything & Activity Feed
          </h3>
          {data && (
            <span className="text-xs font-mono rounded-none border border-border bg-muted/40 px-2 py-0.5 text-foreground">
              {data.totalProjects} {data.totalProjects === 1 ? 'Project' : 'Projects'} Monitored
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Global feed showing recent activity, upcoming contingency dates, and assigned to-dos across all active deals.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition min-h-[44px] ${
            activeTab === 'activity'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClockCounterClockwise size={16} />
          <span>Recent Activity</span>
          {data && data.activity.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-none bg-muted text-foreground">
              {data.activity.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition min-h-[44px] ${
            activeTab === 'assignments'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckSquare size={16} />
          <span>My Assignments</span>
          {data && data.assignments.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-none bg-muted text-foreground">
              {data.assignments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deadlines')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition min-h-[44px] ${
            activeTab === 'deadlines'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck size={16} />
          <span>Upcoming Dates</span>
          {data && data.upcomingDeadlines.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-none bg-muted text-foreground">
              {data.upcomingDeadlines.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading portfolio activity and assignments...
        </div>
      )}

      {error && (
        <div className="rounded-none border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Subtab Contents */}
      {!loading && !error && data && (
        <div>
          {/* 1. Global Activity */}
          {activeTab === 'activity' && (
            <div className="space-y-2">
              {data.activity.length === 0 ? (
                <div className="rounded-none border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                  No activity recorded across portfolio projects yet.
                </div>
              ) : (
                data.activity.map((item) => (
                  <div
                    key={item.entry.id}
                    className="rounded-none border border-border bg-card p-4 transition hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/project/${item.projectId}`}
                          className="font-semibold text-xs text-foreground hover:underline flex items-center gap-1"
                        >
                          <Building size={14} className="text-muted-foreground" />
                          <span>{item.projectName}</span>
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded-none border border-border bg-muted/20">
                          {item.entry.kind}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium">{item.entry.summary}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>By {item.entry.actorName}</span>
                        <span>·</span>
                        <Clock size={12} />
                        <span>
                          {formatDate(item.entry.at)} {formatTime(item.entry.at)}
                        </span>
                      </p>
                    </div>

                    <Link
                      href={`/project/${item.projectId}`}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-foreground bg-background border border-border hover:bg-muted px-3 py-1.5 rounded-none transition min-h-[44px]"
                    >
                      <span>Open Deal</span>
                      <CaretRight size={14} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. My Assignments */}
          {activeTab === 'assignments' && (
            <div className="space-y-2">
              {data.assignments.length === 0 ? (
                <div className="rounded-none border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                  No pending assignments found across your projects.
                </div>
              ) : (
                data.assignments.map((item) => (
                  <div
                    key={item.task.id}
                    className="rounded-none border border-border bg-card p-4 transition hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/project/${item.projectId}`}
                          className="font-semibold text-xs text-foreground hover:underline flex items-center gap-1"
                        >
                          <Building size={14} className="text-muted-foreground" />
                          <span>{item.projectName}</span>
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded-none border border-border bg-muted/20">
                          {item.projectPhase}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-foreground">{item.task.title}</h4>
                      {item.task.dueDate && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CalendarCheck size={12} />
                          <span>Due: {item.task.dueDate}</span>
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/project/${item.projectId}`}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-foreground bg-background border border-border hover:bg-muted px-3 py-1.5 rounded-none transition min-h-[44px]"
                    >
                      <span>View in Project</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. Upcoming Dates */}
          {activeTab === 'deadlines' && (
            <div className="space-y-2">
              {data.upcomingDeadlines.length === 0 ? (
                <div className="rounded-none border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                  No upcoming calendar dates or contingency deadlines scheduled.
                </div>
              ) : (
                data.upcomingDeadlines.map((item) => (
                  <div
                    key={`${item.projectId}-${item.event.id}`}
                    className="rounded-none border border-border bg-card p-4 transition hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/project/${item.projectId}`}
                          className="font-semibold text-xs text-foreground hover:underline flex items-center gap-1"
                        >
                          <Building size={14} className="text-muted-foreground" />
                          <span>{item.projectName}</span>
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded-none border border-border bg-muted/20">
                          {item.event.category}
                        </span>
                        {item.event.isHardDate && (
                          <span className="text-[10px] font-mono font-semibold text-destructive uppercase px-1.5 py-0.5 rounded-none border border-destructive/40 bg-destructive/10 flex items-center gap-1">
                            <WarningCircle size={10} />
                            Hard Date
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-medium text-foreground">{item.event.title}</h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <CalendarCheck size={12} />
                        <span>Date: {item.event.date}</span>
                        {item.event.responsibleParty && (
                          <>
                            <span>·</span>
                            <span>Responsible: {item.event.responsibleParty}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/project/${item.projectId}`}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-foreground bg-background border border-border hover:bg-muted px-3 py-1.5 rounded-none transition min-h-[44px]"
                    >
                      <span>Go to Project</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
