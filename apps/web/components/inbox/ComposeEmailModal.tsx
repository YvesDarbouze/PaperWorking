'use client';

import { useEffect, useState } from 'react';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import BottomSheet from '@/components/ui/BottomSheet';
import { CheckCircle } from '@phosphor-icons/react';

export default function ComposeEmailModal({
  isOpen,
  onClose,
  defaultProjectId,
  defaultTo,
  defaultSubject,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultTo?: string;
  defaultSubject?: string;
  onSent?: () => void;
}) {
  const [to, setTo] = useState(defaultTo ?? '');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSent(false);
    setErrorMsg(null);
    setTo(defaultTo ?? '');
    setSubject(defaultSubject ?? '');
    setBody('');
    setProjectId(defaultProjectId ?? '');
  }, [isOpen, defaultProjectId, defaultTo, defaultSubject]);

  if (!isOpen) return null;

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    setSending(true);
    setErrorMsg(null);

    const targetProject = SEED_PROJECTS.find((p) => p.id === projectId);
    const projectName = targetProject ? targetProject.propertyName : 'General Workspace';

    try {
      // 1. Dispatch to Unified Inbox API so the outgoing message is immediately persisted in user's feed
      const inboxRes = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'team',
          type: 'TEAM_INVITE',
          subject: subject.trim(),
          project: projectName,
          from: 'You (Outgoing)',
          fromRole: 'Operator',
          body: `To: ${to.trim()}\n\n${body.trim()}`,
          unread: false,
          actionable: false,
        }),
      });

      if (!inboxRes.ok) {
        setErrorMsg('Message could not be saved. Please try again.');
        return;
      }

      setSent(true);
      if (onSent) onSent();
      setTimeout(onClose, 1600);
    } catch {
      setErrorMsg('Message could not be saved. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Message"
      description="Send an operational message or announcement across your workspace."
      dataTestId="compose-email-modal"
      maxWidth="max-w-lg"
    >
      {sent ? (
        <div className="py-8 text-center space-y-2">
          <CheckCircle size={36} className="text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold text-emerald-400">
            Message saved to your inbox.
          </p>
          <p className="text-xs text-white/50">
            Email delivery to recipients is not set up yet, so {to.trim() || 'the recipient'} was not emailed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMsg ? (
            <div className="rounded-none border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
              {errorMsg}
            </div>
          ) : null}

          <div className="space-y-1">
            <label
              htmlFor="compose-project-select"
              className="block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Related Project <span className="font-normal text-white/30 lowercase">(optional)</span>
            </label>
            <select
              id="compose-project-select"
              data-testid="compose-project-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-11 min-h-[44px] w-full min-w-0 max-w-full cursor-pointer truncate rounded-none border border-white/10 bg-[#0d0a0b] px-3 text-base md:text-sm text-white outline-none focus:border-emerald-500/40"
            >
              <option value="" className="bg-slate-950 text-white/60">
                None (General Workspace)
              </option>
              {SEED_PROJECTS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-950 text-white">
                  {p.propertyName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="compose-to-input"
              className="block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Recipient Email (To)
            </label>
            <input
              id="compose-to-input"
              data-testid="compose-to-input"
              type="email"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. team@partnercapital.com"
              className="h-11 min-h-[44px] w-full rounded-none border border-white/10 bg-[#0d0a0b] px-3 text-base md:text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="compose-subject-input"
              className="block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Subject
            </label>
            <input
              id="compose-subject-input"
              data-testid="compose-subject-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Q3 Portfolio Review"
              className="h-11 min-h-[44px] w-full rounded-none border border-white/10 bg-[#0d0a0b] px-3 text-base md:text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="compose-body-textarea"
              className="block text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Message Body
            </label>
            <textarea
              id="compose-body-textarea"
              data-testid="compose-body-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write your message…"
              className="w-full resize-none rounded-none border border-white/10 bg-[#0d0a0b] px-3 py-2.5 text-base md:text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/40"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-none border border-white/15 px-5 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5 active:scale-98"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
              onClick={() => void handleSend()}
              className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-none bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40 active:scale-98"
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
