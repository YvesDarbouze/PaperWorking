'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ReportSpamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0a0b] flex items-center justify-center text-pw-black px-4">
        <Loader2 className="w-8 h-8 animate-spin text-pw-primary" />
      </div>
    }>
      <ReportSpamPageInner />
    </Suspense>
  );
}

function ReportSpamPageInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const projectId = searchParams.get('projectId') || '';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReport = async () => {
    if (!email || !token || !projectId) {
      setError('Invalid report parameters. Make sure you clicked the correct link in your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/identity/report-spam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, projectId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !!(email && token && projectId);

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-[#e8e6ea] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Paper<span className="font-light text-pw-primary">Working</span>
          </span>
        </div>
        <Link href="/" className="text-xs text-pw-muted hover:text-white transition-colors">
          Back to website
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 z-10">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/5 relative overflow-hidden bg-pw-glass-bg/20">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] pointer-events-none" />

          {!success ? (
            <div className="space-y-6">
              {/* Header Icon & Title */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-4 border border-red-500/20">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Report Unsolicited Invitation</h2>
                <p className="text-xs text-pw-muted mt-2">
                  Help us keep PaperWorking clean and professional.
                </p>
              </div>

              {/* Details table */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-4.5 space-y-3.5 text-sm">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-pw-muted text-xs">Recipient Email</span>
                  <span className="text-white font-medium truncate max-w-[200px]">{email || 'Not specified'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-pw-muted text-xs">Project Identifier</span>
                  <span className="text-white font-mono text-xs truncate max-w-[200px]">{projectId || 'Not specified'}</span>
                </div>
              </div>

              {/* Error indicator */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              {/* Action Button */}
              <div>
                <button
                  onClick={handleReport}
                  disabled={loading || !isFormValid}
                  className="luminous-button w-full bg-red-500 hover:bg-red-600 active:scale-[0.99] transition-all py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-black flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {loading ? 'Submitting Report…' : 'Confirm Spam Report'}
                </button>
              </div>

              <p className="text-[11px] text-center text-pw-muted leading-relaxed">
                By reporting, the inviter's sending privilege status is reviewed. 
                Multiple spam reports trigger automatic suspension of their account's invitation capability.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-center py-4">
              {/* Success state */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-2 border border-emerald-500/20">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Report Logged Successfully</h3>
              <p className="text-sm text-pw-muted leading-relaxed max-w-sm mx-auto">
                Thank you. We have recorded your spam report. The invitation is marked as resolved and the inviter's email reputation has been updated.
              </p>
              
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-pw-primary hover:underline uppercase tracking-wider"
                >
                  Return to homepage
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 text-center border-t border-white/5 text-[11px] text-pw-muted">
        &copy; {new Date().getFullYear()} PaperWorking Inc. All rights reserved. 
        Read our terms of service and compliance rules.
      </footer>
    </div>
  );
}
