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
      <body className="bg-background text-foreground antialiased font-sans m-0 p-0 flex min-h-screen items-center justify-center">
        <div
          data-testid="global-root-error-container"
          className="max-w-md w-full mx-4 p-8 rounded-none border border-border bg-card shadow-lg text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-none bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-bold text-xl">
            !
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2">
            System Error
          </h1>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            A critical application error occurred. No debugging information is exposed for security reasons.
          </p>

          <button
            type="button"
            onClick={() => reset()}
            data-testid="global-error-retry-button"
            className="w-full min-h-[44px] py-2.5 px-4 rounded-none bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
