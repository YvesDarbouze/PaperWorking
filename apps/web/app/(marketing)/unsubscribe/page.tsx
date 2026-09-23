'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type UnsubscribeStatus = 'loading' | 'success' | 'error';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const projectId = searchParams.get('projectId');
  const [status, setStatus] = useState<UnsubscribeStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Missing email address.');
      return;
    }

    let cancelled = false;

    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, projectId: projectId ?? undefined }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; message?: string; error?: string }) => {
        if (cancelled) return;
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'You have been unsubscribed.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to process unsubscribe request.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setMessage('A network error occurred. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [email, projectId]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0f] p-8 text-center shadow-2xl space-y-6">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
          <span className="material-symbols-outlined text-3xl">mark_email_read</span>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold uppercase tracking-wider text-white">Unsubscribe Request</h1>
        {email && <p className="text-xs text-white/50">{email}</p>}
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <span className="material-symbols-outlined animate-spin text-3xl text-[color:var(--color-primary)]">
            progress_activity
          </span>
          <p className="text-xs uppercase tracking-widest text-white/60">Processing request...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 py-4">
          <div className="rounded-xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 p-3 text-xs font-medium text-[color:var(--color-primary)]">
            {message}
          </div>
          <p className="text-[11px] text-white/50">
            You will no longer receive investment invitations or automated email updates for this
            project.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {message}
          </div>
        </div>
      )}

      <div className="border-t border-white/5 pt-4">
        <Link
          href="/"
          className="inline-block w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10"
        >
          Go to PaperWorking Home
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main
      className="flex min-h-[60vh] items-center justify-center bg-[#0a0a0f] px-4 py-16 text-white"
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Suspense
        fallback={
          <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0a0a0f] p-8 text-center shadow-2xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-[color:var(--color-primary)]">
              progress_activity
            </span>
            <p className="text-xs uppercase tracking-widest text-white/60">Loading context...</p>
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
