'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Folder,
  Shield,
  FileText,
  ChatCircleText,
  CalendarCheck,
  Table,
  CheckCircle,
  WarningCircle,
  Eye,
} from '@phosphor-icons/react';

interface PublicProjectData {
  id: string;
  title: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  currentPhase: string;
  coverImageUrl?: string;
  tasks: any[];
  taskLists: any[];
  messageTopics: any[];
  cardColumns: any[];
  scheduleEvents: any[];
  documents: any[];
}

export default function PublicProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const page = (params.page as string) || 'overview';
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    project: PublicProjectData;
    shareInfo: { page: string; label?: string; expiresAt?: string; vendorOnly: boolean };
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Access Denied: A valid public share link token is required to view this project.');
      setLoading(false);
      return;
    }

    async function loadPublicData() {
      try {
        const res = await fetch(`/api/projects/${projectId}/public-view?token=${encodeURIComponent(token!)}&page=${encodeURIComponent(page)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || err.error || 'Failed to load public project view');
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to access shared project.');
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [projectId, page, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="h-6 w-6 border-2 border-foreground border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Decrypting project access...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-border bg-card p-6 space-y-4 text-center">
          <WarningCircle size={32} className="text-destructive mx-auto" />
          <h2 className="text-base font-semibold tracking-tight text-foreground">Project Link Unavailable</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
          <div className="pt-2 border-t border-border">
            <span className="text-[11px] font-mono text-muted-foreground">
              PaperWorking Secure Sharing • Access restricted by project administrator
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { project, shareInfo } = data;
  const locationString = [project.city, project.state].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-border bg-muted/60 text-foreground">
              <Folder size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                  {project.title || project.address || 'Real Estate Project'}
                </h1>
                <span className="text-[10px] font-mono uppercase border border-border px-1.5 py-0.5 bg-muted text-muted-foreground">
                  Public Guest View
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {project.address} {locationString ? `• ${locationString}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-border px-3 py-1.5 bg-muted/40 text-xs font-mono text-muted-foreground">
              <Eye size={14} />
              <span>{shareInfo.vendorOnly ? 'Vendor-Filtered View' : 'Read-Only Project View'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs based on shareInfo */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-xs">
          <span className="font-semibold uppercase tracking-wider text-foreground">
            Current Section: {page.replace('_', ' ')}
          </span>
          {shareInfo.label && (
            <span className="text-muted-foreground font-mono">({shareInfo.label})</span>
          )}
        </div>

        {/* SECTION: OVERVIEW */}
        {(page === 'overview' || shareInfo.page === 'overview') && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 border border-border bg-card space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Current Phase</span>
                <p className="text-sm font-semibold uppercase tracking-tight text-foreground">
                  {project.currentPhase}
                </p>
              </div>
              <div className="p-4 border border-border bg-card space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Active Tasks</span>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {project.tasks.length} tasks
                </p>
              </div>
              <div className="p-4 border border-border bg-card space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Deadlines</span>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {project.scheduleEvents.length} upcoming
                </p>
              </div>
              <div className="p-4 border border-border bg-card space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Documents</span>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {project.documents.length} available
                </p>
              </div>
            </div>

            {/* Tasks Summary */}
            <div className="border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold uppercase tracking-tight text-foreground flex items-center gap-1.5">
                  <CalendarCheck size={16} />
                  Shared Project Tasks
                </span>
                <span className="text-xs font-mono text-muted-foreground">{project.tasks.length} Total</span>
              </div>
              {project.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No public tasks shared.</p>
              ) : (
                <div className="space-y-2">
                  {project.tasks.slice(0, 10).map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-2 p-2.5 border border-border bg-background text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          size={14}
                          className={t.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}
                        />
                        <span className={t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}>
                          {t.title}
                        </span>
                      </div>
                      {t.dueDate && (
                        <span className="text-[11px] font-mono text-muted-foreground">Due: {t.dueDate}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule Deadlines */}
            <div className="border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold uppercase tracking-tight text-foreground flex items-center gap-1.5">
                  <CalendarCheck size={16} />
                  Critical Contingencies & Deadlines
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {project.scheduleEvents.length} Events
                </span>
              </div>
              {project.scheduleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No scheduled dates shared.</p>
              ) : (
                <div className="space-y-2">
                  {project.scheduleEvents.map((e: any) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 p-2.5 border border-border bg-background text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground">{e.title}</span>
                        {e.isHardDate && (
                          <span className="ml-2 text-[10px] font-mono border border-border px-1 py-0.2 bg-muted text-muted-foreground">
                            Hard Deadline
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">{e.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: MESSAGES */}
        {page === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                <ChatCircleText size={18} />
                Message Board (Shared Updates)
              </h2>
            </div>
            {project.messageTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No topics shared with guests.</p>
            ) : (
              <div className="space-y-3">
                {project.messageTopics.map((topic: any) => (
                  <div key={topic.id} className="p-4 border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{topic.title}</h3>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {new Date(topic.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{topic.content}</p>
                    <div className="pt-2 border-t border-border flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span>Author: {topic.author?.name || 'Investment Team'}</span>
                      <span>•</span>
                      <span>Category: {topic.category || 'General'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION: TASKS */}
        {page === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              <CalendarCheck size={18} />
              Project To-Do Lists
            </h2>
            <div className="space-y-2">
              {project.tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border border-border bg-card text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      size={16}
                      className={task.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}
                    />
                    <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                    {task.assigneeName && <span>Assigned: {task.assigneeName}</span>}
                    {task.dueDate && <span>Due: {task.dueDate}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: CARD TABLE */}
        {page === 'card_table' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              <Table size={18} />
              The REIL (Stage Kanban)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {project.cardColumns.map((col: any) => (
                <div key={col.id} className="border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-semibold uppercase tracking-tight text-foreground">{col.title}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{(col.cards || []).length}</span>
                  </div>
                  <div className="space-y-2">
                    {(col.cards || []).map((card: any) => (
                      <div key={card.id} className="p-2.5 border border-border bg-background space-y-1">
                        <p className="text-xs font-medium text-foreground">{card.title}</p>
                        {card.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{card.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: DOCS */}
        {page === 'docs' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              <FileText size={18} />
              Shared Documents & Files
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project.documents.map((doc: any) => (
                <div key={doc.id} className="p-3 border border-border bg-card flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{doc.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{doc.type || 'Document'}</p>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted font-mono"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 sm:px-6 py-4 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>PaperWorking • Real Estate Investment Lifecycle Management</span>
          <span className="font-mono text-[11px]">Protected by Public Access Token</span>
        </div>
      </footer>
    </div>
  );
}
