'use client';

import { useCallback, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════════════
   DealUpdateComposer — Capital raise investor update panel

   Used in Phase 1 "Capital Raising" alongside CrowdfundingTracker.
   Generates an AI draft and sends it to commitment-holder emails.
   ═══════════════════════════════════════════════════════════════ */

interface DealUpdateComposerProps {
  projectId: string;
  phaseColor?: string;
}

async function getIdToken(): Promise<string | null> {
  return getAuth().currentUser?.getIdToken() ?? null;
}

export function DealUpdateComposer({
  projectId,
  phaseColor = '#454955',
}: DealUpdateComposerProps) {
  const { project } = useWorkspaceProject();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultSubject = `Capital raise update: ${project?.propertyName || 'Deal'}`;

  const collectRecipientEmails = useCallback(async (): Promise<string[]> => {
    const snap = await getDocs(collection(db, 'projects', projectId, 'commitments'));
    const emails = snap.docs
      .map((doc) => doc.data().email as string | null | undefined)
      .filter((email): email is string => !!email && email.includes('@'));
    return [...new Set(emails)];
  }, [projectId]);

  const handleGenerate = async () => {
    const idToken = await getIdToken();
    if (!idToken) {
      toast.error('Please sign in again.');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId,
          audience: 'investors',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate draft');

      setBody(data.draft);
      if (!subject.trim()) setSubject(defaultSubject);
      toast.success('Draft ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate draft');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Write or generate an update first.');
      return;
    }

    const idToken = await getIdToken();
    if (!idToken) {
      toast.error('Please sign in again.');
      return;
    }

    setSending(true);
    try {
      const recipients = await collectRecipientEmails();
      if (recipients.length === 0) {
        toast.error('No investor emails found on commitments yet.');
        return;
      }

      const resolvedSubject = subject.trim() || defaultSubject;
      const html = `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${body.trim()}</div>`;

      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          projectId,
          to: recipients,
          subject: resolvedSubject,
          html,
          text: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send update');

      toast.success(
        data.mock ? 'Update logged (email mocked in dev)' : `Update sent to ${recipients.length} investor(s)`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send update');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#262328] bg-[#1a181b]/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold tracking-[0.05em] text-[#9E9DA0] uppercase">
          Investor Update
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50"
          style={{ color: phaseColor }}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          AI Draft
        </button>
      </div>

      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={defaultSubject}
        className="w-full rounded-md border border-[#262328] bg-[#0d0a0b] px-3 py-2 text-[13px] text-[#E8E6EA] placeholder:text-[#6b6a6d] outline-none focus:border-[#454955]"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Share progress with team members and co-investors…"
        className="w-full resize-y rounded-md border border-[#262328] bg-[#0d0a0b] px-3 py-2 text-[13px] text-[#E8E6EA] placeholder:text-[#6b6a6d] outline-none focus:border-[#454955]"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !body.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold text-[#0d0a0b] transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: phaseColor }}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send Update to Investors
      </button>
    </div>
  );
}
