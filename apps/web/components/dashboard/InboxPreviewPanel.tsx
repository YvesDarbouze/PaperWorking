'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import DashboardPageHeader, {
  DashboardPrimaryButton,
} from '@/components/dashboard/DashboardPageHeader';
import {
  INBOX_TABS,
  INBOX_THREADS,
  type InboxTabId,
} from '@/lib/dashboard/shell-seed';

export default function InboxPreviewPanel() {
  const [tab, setTab] = useState<InboxTabId>('all');
  const [selectedId, setSelectedId] = useState<string | null>(INBOX_THREADS[0]?.id ?? null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const threads = useMemo(() => {
    return INBOX_THREADS.filter((thread) => (tab === 'all' ? true : thread.tab === tab));
  }, [tab]);

  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0] ?? null;

  const unreadFor = (id: InboxTabId) =>
    INBOX_THREADS.filter(
      (thread) =>
        (id === 'all' || thread.tab === id) && thread.unread && !readIds.has(thread.id),
    ).length;

  function openThread(id: string) {
    setSelectedId(id);
    setReadIds((prev) => new Set(prev).add(id));
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
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
                tab === option.id
                  ? 'bg-white text-black'
                  : 'border border-white/12 text-white/60 hover:bg-white/5'
              }`}
            >
              {option.label}
              {count > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                    tab === option.id ? 'bg-black/10' : 'bg-emerald-500/20 text-emerald-300'
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
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121014]/90">
          {threads.length === 0 ? (
            <p className="p-8 text-sm text-white/45">No threads in this tab.</p>
          ) : (
            threads.map((thread) => {
              const isUnread = thread.unread && !readIds.has(thread.id);
              const isActive = selected?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => openThread(thread.id)}
                  className={`block w-full border-b border-white/6 px-4 py-3.5 text-left transition ${
                    isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {isUnread ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                    )}
                    <span className="text-[11px] text-white/40">{thread.project}</span>
                    <span className="ml-auto text-[10px] text-white/35">
                      {new Date(thread.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm ${isUnread ? 'font-semibold text-white' : 'text-white/75'}`}>
                    {thread.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/45">{thread.preview}</p>
                </button>
              );
            })
          )}
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#121014]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {selected ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.08em] text-white/45">{selected.project}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#fdfffc]">{selected.subject}</h2>
              <p className="mt-1 text-sm text-white/55">
                From {selected.from} · {new Date(selected.receivedAt).toLocaleString()}
              </p>
              <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/75">
                {selected.preview}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-white/12 px-3 py-2 text-[12px] font-semibold text-white/70 no-underline"
                >
                  Open related
                </Link>
                <button
                  type="button"
                  onClick={() => openThread(selected.id)}
                  className="rounded-lg bg-white/10 px-3 py-2 text-[12px] font-semibold text-white"
                >
                  Mark read
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/45">Select a thread to read.</p>
          )}
        </article>
      </div>
    </div>
  );
}
