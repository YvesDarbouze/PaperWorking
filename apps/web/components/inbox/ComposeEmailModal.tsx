'use client';

import { useEffect, useState } from 'react';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import BottomSheet from '@/components/ui/BottomSheet';

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
  const [projectId, setProjectId] = useState(defaultProjectId ?? SEED_PROJECTS[0]?.id ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSent(false);
    setTo('');
    setSubject('');
    setBody('');
    setProjectId(defaultProjectId ?? SEED_PROJECTS[0]?.id ?? '');
  }, [isOpen, defaultProjectId]);

  if (!isOpen) return null;

  async function handleSend() {
    setSending(true);
    await new Promise((r) => setTimeout(r, 400));
    setSending(false);
    setSent(true);
    setTimeout(onClose, 700);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Compose"
      description="Send a message or update to your project partners."
      dataTestId="compose-email-modal"
      maxWidth="max-w-lg"
    >
      {sent ? (
        <p className="py-8 text-center text-sm font-semibold text-emerald-400">
          Message queued (seed preview).
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Project
            </span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none focus:border-emerald-500/40"
            >
              {SEED_PROJECTS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-950">
                  {p.propertyName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">To</span>
            <input
              type="email"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Subject
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0d0a0b] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Message
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write your message…"
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0d0a0b] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5 active:scale-98"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || !to.trim() || !subject.trim()}
              onClick={() => void handleSend()}
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40 active:scale-98"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
