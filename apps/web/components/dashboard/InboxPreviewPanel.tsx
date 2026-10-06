'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardPageHeader, {
  DashboardPrimaryButton,
} from '@/components/dashboard/DashboardPageHeader';
import {
  INBOX_TABS,
  INBOX_THREADS,
  type InboxTabId,
  type InboxThread,
} from '@/lib/dashboard/shell-seed';

export default function InboxPreviewPanel() {
  const [items, setItems] = useState<InboxThread[]>(() => [...INBOX_THREADS]);
  const [tab, setTab] = useState<InboxTabId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(INBOX_THREADS[0]?.id ?? null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.threads)) {
          setItems(data.threads);
        }
      }
    } catch {
      // Non-fatal, use initial state
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const threads = useMemo(() => {
    return items.filter((thread) => (tab === 'all' ? true : thread.tab === tab));
  }, [items, tab]);

  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0] ?? null;

  const unreadFor = (id: InboxTabId) =>
    items.filter(
      (thread) =>
        (id === 'all' || thread.tab === id) && thread.unread && !readIds.has(thread.id),
    ).length;

  function openThread(id: string) {
    setSelectedId(id);
    setReadIds((prev) => new Set(prev).add(id));
    fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unread: false }),
    }).catch(() => undefined);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Inbox"
        subtitle={`${unreadFor('all')} unread across opportunities, tasks, vendors, and system alerts`}
        actions={<DashboardPrimaryButton href="/dashboard/inbox" icon="edit">Compose</DashboardPrimaryButton>}
      />

      <div className="flex flex-wrap gap-2">
        {INBOX_TABS.map((option) => {
          const count = unreadFor(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-none px-3.5 py-2 text-xs font-semibold transition touch-target ${
                tab === option.id
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {option.label}
              {count > 0 ? (
                <span
                  className={`rounded-none px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    tab === option.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="overflow-hidden rounded-none border border-border bg-card">
          {threads.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">No threads in this tab.</p>
          ) : (
            threads.map((thread) => {
              const isUnread = thread.unread && !readIds.has(thread.id);
              const isActive = selected?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className={`block w-full min-h-[44px] border-b border-border/50 px-4 py-3.5 text-left transition ${
                    isActive ? 'bg-muted/60' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {isUnread ? (
                      <span className="h-1.5 w-1.5 rounded-none bg-[var(--status-live)]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-none bg-transparent" />
                    )}
                    <span className="text-[11px] text-muted-foreground">{thread.project}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/70">
                      {new Date(thread.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                    {thread.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{thread.preview}</p>
                </button>
              );
            })
          )}
        </div>

        <article className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm ring-1 ring-foreground/10">
          {selected ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{selected.project}</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{selected.subject}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                From {selected.from} · {new Date(selected.receivedAt).toLocaleString()}
              </p>
              <div className="mt-5 rounded-none border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed text-foreground/90">
                {selected.preview}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center rounded-none border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground no-underline shadow-sm transition hover:bg-muted touch-target"
                >
                  Open related
                </Link>
                <button
                  type="button"
                  onClick={() => openThread(selected.id)}
                  className="inline-flex min-h-[44px] items-center rounded-none bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 touch-target"
                >
                  Mark read
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a thread to read.</p>
          )}
        </article>
      </div>
    </div>
  );
}
