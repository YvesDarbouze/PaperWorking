'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email');
  const projectId = searchParams?.get('projectId');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email || !projectId) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Missing email or project context.');
      return;
    }

    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, projectId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'You have been unsubscribed.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to process unsubscribe request.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('A network error occurred. Please try again.');
      });
  }, [email, projectId]);

  return (
    <div className="w-full max-w-md bg-pw-night-bg/98 border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-[#454955]/10 border border-[#454955]/20 rounded-full flex items-center justify-center text-[#454955]">
          <MailCheck className="w-8 h-8" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Unsubscribe Request</h1>
        <p className="text-xs text-[#9E9DA0]">{email}</p>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-[#454955] animate-spin" />
          <p className="text-xs uppercase tracking-widest text-[#9E9DA0]/80">Processing request...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 py-4">
          <div className="p-3 bg-pw-success-container border border-pw-success-border rounded-xl text-pw-success text-xs font-medium">
            {message}
          </div>
          <p className="text-[11px] text-[#9E9DA0]/70">
            You will no longer receive investment invitations or automated email updates for this project.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 py-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
            {message}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/5">
        <Link
          href="/"
          className="inline-block w-full py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all text-center"
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
      className="min-h-screen bg-[#0d0a0b] flex items-center justify-center px-4"
      style={{
        backgroundImage: 'radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Suspense fallback={
        <div className="w-full max-w-md bg-pw-night-bg/98 border border-white/10 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-[#454955] animate-spin" />
          <p className="text-xs uppercase tracking-widest text-[#9E9DA0]/80">Loading context...</p>
        </div>
      }>
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
