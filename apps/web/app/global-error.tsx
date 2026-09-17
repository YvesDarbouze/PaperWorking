'use client';

import React, { useEffect } from 'react';
import { errorTracker, logger } from '@paperworking/shared';

export default function GlobalRootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Root layout catastrophic exception caught by global-error boundary', error, {
      digest: error.digest,
    });
    errorTracker.captureException(error, {
      tags: { boundary: 'root-global-error' },
      extra: { digest: error.digest },
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans m-0 p-0 flex min-h-screen items-center justify-center">
        <div
          data-testid="global-root-error-container"
          className="max-w-md w-full mx-4 p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl text-center backdrop-blur-xl"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl">
            !
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white mb-2">
            System Error
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            A critical application error occurred. No debugging information is exposed for security reasons.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            data-testid="global-error-retry-button"
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
