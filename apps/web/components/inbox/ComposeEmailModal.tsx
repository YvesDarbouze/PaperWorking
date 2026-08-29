'use client';

import { useEffect, useState } from 'react';
import { loadProjects } from '@/lib/data';

type ProjectOption = { id: string; label: string };

export default function ComposeEmailModal({
  isOpen,
  onClose,
  defaultProjectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await loadProjects();
        if (cancelled) return;
        const options = (Array.isArray(list) ? list : []).map((p) => {
          const row = p as Record<string, unknown>;
          return {
            id: String(row.id ?? ''),
            label: String(row.propertyName ?? row.name ?? row.title ?? row.id ?? ''),
          };
        });
        setProjects(options);
        setProjectId(defaultProjectId ?? options[0]?.id ?? '');
      } catch {
        if (!cancelled) {
          setProjects([]);
          setProjectId(defaultProjectId ?? '');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultProjectId]);

  useEffect(() => {
    if (!isOpen) return;
    setSent(false);
    setTo('');
    setSubject('');
    setBody('');
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSend() {
    setSending(true);
    await new Promise((r) => setTimeout(r, 400));
    setSending(false);
    setSent(true);
    setTimeout(onClose, 700);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      data-testid="compose-email-modal"
    >
      <div
        role="dialog"
        aria-label="Compose email"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#161318] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Compose</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {sent ? (
          <p className="py-8 text-center text-sm font-semibold text-emerald-400">
            Message queued.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Project
              </span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none focus:border-emerald-500/40"
              >
                {projects.length === 0 ? (
                  <option value="" className="bg-slate-950">
                    No projects
                  </option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-950">
                      {p.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">To</span>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="name@example.com"
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Subject
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none focus:border-emerald-500/40"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Message
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0d0a0b] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
