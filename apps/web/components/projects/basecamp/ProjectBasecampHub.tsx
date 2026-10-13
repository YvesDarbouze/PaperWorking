'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ChatCenteredDots,
  FileText,
  FilePdf,
  FileXls,
  Image as ImageIcon,
  CheckSquareOffset,
  Kanban,
  Flame,
  CalendarBlank,
  PaperPlaneRight,
  ArrowRight,
  Warning,
  Eye,
  Check,
  Plus,
  Question,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import type { ProjectWorkspace, ProjectDocument } from '@/lib/projects/types';
import { buildProjectSchedule } from '@/lib/projects/schedule';
import { projectFileKind } from '@/lib/projects/project-files';
import BasecampMiniCalendar from './BasecampMiniCalendar';

interface ProjectBasecampHubProps {
  project: ProjectWorkspace;
  vendorMode: boolean;
  onOpenTool: (toolId: string) => void;
  onInviteTeam?: () => void;
  onRefresh: () => void;
}

function getDocumentIcon(doc: ProjectDocument) {
  const kind = projectFileKind(doc.name, doc.type);
  switch (kind) {
    case 'pdf':
      return <FilePdf size={20} className="text-foreground shrink-0" />;
    case 'spreadsheet':
      return <FileXls size={20} className="text-foreground shrink-0" />;
    case 'image':
      return <ImageIcon size={20} className="text-foreground shrink-0" />;
    default:
      return <FileText size={20} className="text-foreground shrink-0" />;
  }
}

export default function ProjectBasecampHub({
  project,
  vendorMode,
  onOpenTool,
  onInviteTeam,
  onRefresh,
}: ProjectBasecampHubProps) {
  // 1. Message Board: Filtered topics
  const topics = useMemo(() => {
    const list = project.messageTopics || [];
    return vendorMode ? list.filter((t) => t.vendorVisible) : list;
  }, [project.messageTopics, vendorMode]);

  const featuredTopic = topics[0];
  const otherTopics = topics.slice(1, 4);

  // 2. Docs & Files: All uploaded documents, spreadsheets, images, PDFs
  const projectDocs = useMemo(() => {
    return project.documents || [];
  }, [project.documents]);

  // 3. Project Tasks: Grouped tasks and Hill Chart items
  const activeTasks = useMemo(() => {
    const tasks = project.tasks || [];
    const filtered = vendorMode ? tasks.filter((t) => t.vendorVisible) : tasks;
    return filtered.slice(0, 4);
  }, [project.tasks, vendorMode]);

  const hillScopes = project.hillChartItems || [];

  // 4. Chat: Campfire latest messages
  const chatMessages = useMemo(() => {
    const msgs = project.campfireMessages || [];
    return msgs.slice(-5);
  }, [project.campfireMessages]);

  // 5. Schedule: Events, contingencies, and milestones
  const scheduleEvents = useMemo(() => {
    return buildProjectSchedule(project);
  }, [project]);

  // 6. The REIL: 4 Stage Columns
  const reilColumns = useMemo(() => {
    const defaultCols = [
      { id: 'col-acq', title: 'Acquisition & Underwriting' },
      { id: 'col-fund', title: 'Fund' },
      { id: 'col-hold', title: 'Hold' },
      { id: 'col-exit', title: 'Exit' },
    ];
    const existing = project.cardColumns || [];
    if (existing.length >= 4) {
      return existing.map((c) => ({
        ...c,
        cards: vendorMode ? c.cards.filter((card) => card.vendorVisible) : c.cards,
      }));
    }
    return defaultCols.map((dc) => {
      const match = existing.find((c) => c.id === dc.id || c.title.toLowerCase().includes(dc.id.replace('col-', '')));
      const cards = match?.cards || [];
      return {
        id: dc.id,
        title: dc.title,
        cards: vendorMode ? cards.filter((card) => card.vendorVisible) : cards,
      };
    });
  }, [project.cardColumns, vendorMode]);

  // 7. Check-ins & Activity Strip
  const activeCheckIn = (project.checkInQuestions || [])[0];
  const recentActivities = useMemo(() => {
    const act = project.activity || [];
    const filtered = vendorMode ? act.filter((a) => a.vendorVisible) : act;
    return filtered.slice(0, 3);
  }, [project.activity, vendorMode]);

  // Helper for toggle task directly from hub
  async function handleToggleTask(taskId: string) {
    try {
      await fetch(`/api/projects/${project.id}/task-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_task', taskId }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  }

  const teamMembers = project.teamMembers || [];

  return (
    <div className="space-y-5">
      {/* Team row: member avatars + invite button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 5).map((member) => (
              <div
                key={member.uid}
                title={`${member.name} - ${member.role}`}
                className="h-8 w-8 rounded-none border-2 border-background bg-foreground text-background flex items-center justify-center text-[11px] font-bold uppercase cursor-default"
              >
                {member.name.slice(0, 2)}
              </div>
            ))}
            {teamMembers.length === 0 && (
              <span className="text-xs text-muted-foreground">No team members yet</span>
            )}
          </div>
          {teamMembers.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {teamMembers.length} on this project
            </span>
          )}
        </div>
        {onInviteTeam && (
          <button
            type="button"
            onClick={onInviteTeam}
            className="flex items-center gap-1.5 rounded-none border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition min-h-[44px]"
          >
            <Plus size={14} />
            Invite Team
          </button>
        )}
      </div>

      {/* Check-ins & Activity Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Check-in Prompt Strip */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenTool('checkins')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenTool('checkins');
            }
          }}
          className="rounded-none border border-border bg-card p-3.5 flex items-center justify-between cursor-pointer hover:border-foreground/40 transition"
          data-testid="hub-strip-checkin"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-none border border-border bg-muted/40 flex items-center justify-center shrink-0">
              <Question size={16} className="text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Automatic Check-in</span>
                {activeCheckIn && (
                  <span className="text-[9px] font-mono uppercase border border-border px-1.5 py-0.2 bg-muted/20 text-foreground">
                    {activeCheckIn.frequency}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                {activeCheckIn ? activeCheckIn.prompt : 'Keep team and contractors aligned with recurring prompts.'}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hover:text-foreground shrink-0 pl-2 inline-flex items-center gap-1">
            <span>Respond</span>
            <ArrowRight size={12} />
          </span>
        </div>

        {/* Live Project Activity Strip */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenTool('activity')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenTool('activity');
            }
          }}
          className="rounded-none border border-border bg-card p-3.5 flex items-center justify-between cursor-pointer hover:border-foreground/40 transition"
          data-testid="hub-strip-activity"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-7 w-7 rounded-none border border-border bg-muted/40 flex items-center justify-center shrink-0">
              <ClockCounterClockwise size={16} className="text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Latest Project Activity</span>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">
                {recentActivities[0]
                  ? `${recentActivities[0].actorName}: ${recentActivities[0].summary}`
                  : 'All collaboration events, file uploads, and tasks are audited.'}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground hover:text-foreground shrink-0 pl-2 inline-flex items-center gap-1">
            <span>Feed</span>
            <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* 6-Card hub grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* CARD 1: Message Board */}
      <div
        role="region"
        aria-label="Message Board summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-messages"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('messages')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <ChatCenteredDots size={18} className="text-foreground shrink-0" />
              <span>Message Board</span>
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {topics.length} topic{topics.length === 1 ? '' : 's'}
            </span>
          </div>

          {featuredTopic ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenTool('messages')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenTool('messages');
                }
              }}
              className="cursor-pointer space-y-1.5 p-3 rounded-none bg-muted/30 border border-border/60 hover:bg-muted/50 transition focus:outline-none focus:ring-1 focus:ring-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-none bg-foreground text-background font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {featuredTopic.author.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{featuredTopic.author.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {new Date(featuredTopic.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <h4 className="text-xs font-bold text-foreground line-clamp-1">{featuredTopic.title}</h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {featuredTopic.content}
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No topics posted yet.
            </div>
          )}

          {/* Additional topic rows */}
          <div className="space-y-1.5 pt-1">
            {otherTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => onOpenTool('messages')}
                className="w-full text-left flex items-center justify-between p-1.5 rounded-none hover:bg-muted text-xs transition min-h-[36px]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-4 w-4 rounded-none bg-muted border border-border text-[9px] font-mono flex items-center justify-center shrink-0 text-muted-foreground">
                    {topic.author.name.slice(0, 1)}
                  </div>
                  <span className="truncate text-foreground font-medium">{topic.title}</span>
                </div>
                {topic.vendorVisible && (
                  <span className="text-[9px] font-mono uppercase text-muted-foreground shrink-0 pl-1">Vendor</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenTool('messages')}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>View all discussions</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* CARD 2: Docs & Files (Documents, Spreadsheets, Images, Media, PDFs) */}
      <div
        role="region"
        aria-label="Docs and Files summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-docs"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('docs')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <FileText size={18} className="text-foreground shrink-0" />
              <span>Docs & Files</span>
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {projectDocs.length} file{projectDocs.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2">
            {projectDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <FileText size={28} className="mx-auto mb-1 text-muted-foreground/60" />
                <p>No documents stored yet.</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Upload closing statements, contracts, or photos.</p>
              </div>
            ) : (
              projectDocs.slice(0, 4).map((doc, idx) => (
                <div
                  key={doc.doc_id || idx}
                  className="flex items-center justify-between p-2 rounded-none bg-muted/20 border border-border/50 hover:bg-muted/40 transition text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {getDocumentIcon(doc)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {doc.fileSize || doc.type || 'Document'}
                      </p>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0 ml-2 min-h-[32px] flex items-center px-1"
                      title="Download or view file"
                    >
                      View
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <Link
            href={`/project/${project.id}/documents`}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>Open Document Vault</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* CARD 3: Project Tasks & Hill Chart */}
      <div
        role="region"
        aria-label="Project Tasks summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-tasks"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('todos')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <CheckSquareOffset size={18} className="text-foreground shrink-0" />
              <span>Project Tasks</span>
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeTasks.length} active
            </span>
          </div>

          {/* Compact Hill Chart Curve */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenTool('hill-chart')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenTool('hill-chart');
              }
            }}
            className="cursor-pointer rounded-none border border-border bg-muted/20 p-2 text-center hover:bg-muted/40 transition focus:outline-none focus:ring-1 focus:ring-foreground"
            title="Click to manage Hill Chart trajectory"
          >
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground pb-1">
              <span>Figuring It Out</span>
              <span>Executing</span>
            </div>
            <svg viewBox="0 0 300 80" className="w-full h-12" aria-label="Hill chart curve">
              <path
                d="M 20 68 Q 150 0 280 68"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="2"
              />
              <line x1="150" y1="10" x2="150" y2="70" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2 2" />
              {hillScopes.slice(0, 4).map((s, idx) => {
                const norm = Math.max(0, Math.min(100, s.position)) / 100;
                const x = 20 + norm * 260;
                const y = 68 - 4 * norm * (1 - norm) * 60;
                return (
                  <circle
                    key={s.id || idx}
                    cx={x}
                    cy={y}
                    r={4}
                    fill="currentColor"
                    stroke="var(--background)"
                    strokeWidth={1}
                  />
                );
              })}
            </svg>
          </div>

          {/* Active Tasks Checklist */}
          <div className="space-y-2 pt-1">
            {activeTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">No active tasks in this view.</p>
            ) : (
              activeTasks.map((t) => {
                const isDone = t.status === 'complete';
                return (
                  <div key={t.id} className="flex items-start gap-2.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t.id)}
                      aria-label={`Mark task ${t.title} as ${isDone ? 'incomplete' : 'complete'}`}
                      className={`mt-0.5 h-4 w-4 rounded-none border flex items-center justify-center transition shrink-0 min-h-[20px] min-w-[20px] ${
                        isDone
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card hover:border-foreground'
                      }`}
                    >
                      {isDone && <Check size={10} weight="bold" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'} truncate`}>
                        {t.title}
                      </p>
                      {t.dueDate && (
                        <p className="text-[10px] text-muted-foreground font-mono">Due: {t.dueDate}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenTool('todos')}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>View all to-dos</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* CARD 4: Chat (Campfire) */}
      <div
        role="region"
        aria-label="Campfire chat summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-campfire"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('campfire')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <Flame size={18} className="text-foreground shrink-0" weight="fill" />
              <span>Chat</span>
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {chatMessages.length} recent
            </span>
          </div>

          {/* Chat Stream */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Flame size={24} className="mx-auto mb-1 text-muted-foreground/50" />
                <p>Campfire is quiet.</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Post a note to the investment team.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-xs space-y-0.5 p-2 rounded-none bg-muted/20 border border-border/40">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{msg.senderName}</span>
                    <span className="font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenTool('campfire')}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>Open Campfire Chat</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* CARD 5: Schedule & Milestones */}
      <div
        role="region"
        aria-label="Schedule summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-schedule"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('schedule')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <CalendarBlank size={18} className="text-foreground shrink-0" />
              <span>Schedule</span>
            </button>
            <a
              href={`/api/projects/${project.id}/schedule/export`}
              download
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition underline min-h-[44px] inline-flex items-center"
              title="Download RFC 5545 iCalendar (.ics)"
            >
              iCal sync
            </a>
          </div>

          {/* Mini Calendar Widget */}
          <BasecampMiniCalendar
            events={scheduleEvents}
            onSelectDate={() => onOpenTool('schedule')}
          />

          {/* Key Upcoming Deadlines */}
          <div className="space-y-1.5 pt-1">
            {scheduleEvents.slice(0, 2).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-1.5 rounded-none bg-muted/20 text-xs border border-border/40"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {ev.isHardDate && <Warning size={12} className="text-destructive shrink-0" weight="bold" />}
                  <span className="truncate text-foreground font-medium">{ev.title}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 pl-1">{ev.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenTool('schedule')}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>View all milestones</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* CARD 6: The REIL (Card Table 4-Step Columns) */}
      <div
        role="region"
        aria-label="The REIL card table summary card"
        className="rounded-none border border-border bg-card p-5 flex flex-col justify-between shadow-xs transition hover:border-foreground/30 group"
        data-testid="hub-card-reil"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => onOpenTool('card-table')}
              className="text-left font-semibold text-foreground text-sm tracking-tight hover:underline flex items-center gap-1.5 min-h-[44px]"
            >
              <Kanban size={18} className="text-foreground shrink-0" />
              <span>The REIL</span>
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              4 lifecycle steps
            </span>
          </div>

          {/* 4 REIL Columns Preview */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {reilColumns.map((col, idx) => (
              <div
                key={col.id}
                className="rounded-none border border-border/60 bg-muted/20 p-2 text-center flex flex-col justify-between h-[180px]"
              >
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground block uppercase truncate">
                    {idx === 0 ? '01 Acq' : idx === 1 ? '02 Fund' : idx === 2 ? '03 Hold' : '04 Exit'}
                  </span>
                  <span className="text-[11px] font-bold text-foreground font-mono mt-0.5 block">
                    {col.cards.length}
                  </span>
                </div>

                <div className="space-y-1 my-auto overflow-hidden">
                  {col.cards.slice(0, 2).map((c) => (
                    <div
                      key={c.id}
                      className="text-[9px] font-medium text-foreground bg-card p-1 border border-border truncate"
                      title={c.title}
                    >
                      {c.title}
                    </div>
                  ))}
                </div>

                <span className="text-[9px] text-muted-foreground font-mono">
                  {idx === 0 ? 'Calc' : idx === 1 ? 'Debt' : idx === 2 ? 'Rehab' : 'Sale'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenTool('card-table')}
            className="text-xs text-foreground font-medium hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <span>Open The REIL board</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
