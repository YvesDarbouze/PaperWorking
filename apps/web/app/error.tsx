'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { errorTracker, logger } from '@paperworking/shared';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server/client-side error through scrubbed structured logger and error tracker
    logger.error('Unhandled page-level exception caught by App Router boundary', error, {
      digest: error.digest,
    });
    errorTracker.captureException(error, {
      tags: { boundary: 'page-error' },
      extra: { digest: error.digest },
    }).catch(() => undefined);
  }, [error]);

  return (
    <div
      data-testid="error-boundary-container"
      className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="w-16 h-16 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
        <span className="material-symbols-outlined text-3xl">error_outline</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
        Something went wrong
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
        An unexpected error occurred while rendering this page. Our technical team has been notified with automated telemetry.
      </p>

      {error.digest && (
        <p data-testid="error-digest-code" className="text-xs text-slate-500 mb-8 font-mono">
          Incident reference: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          data-testid="error-retry-button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[color:var(--color-primary)] text-slate-950 font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Try again
        </button>

        <Link
          href="/dashboard"
          data-testid="error-dashboard-link"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
        >
          Return to Dashboard
        </Link>

        <Link
          href="/support"
          data-testid="error-support-link"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-sm transition-colors"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
