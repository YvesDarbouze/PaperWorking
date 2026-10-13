'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { errorTracker, logger } from '@paperworking/shared';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

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
      <div className="w-16 h-16 mb-6 rounded-none bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
        <WarningCircle className="h-8 w-8" weight="bold" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Something went wrong
      </h1>

      <p className="text-sm text-muted-foreground max-w-md mb-4 leading-relaxed">
        An unexpected error occurred while rendering this page. Our technical team has been notified with automated telemetry.
      </p>

      {error.digest && (
        <p data-testid="error-digest-code" className="text-xs text-muted-foreground mb-8 font-mono">
          Incident reference: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          data-testid="error-retry-button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-opacity min-h-[44px]"
        >
          <ArrowsClockwise className="h-4 w-4" weight="bold" />
          Try again
        </button>

        <Link
          href="/dashboard"
          data-testid="error-dashboard-link"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-semibold text-sm transition-colors min-h-[44px]"
        >
          Return to Dashboard
        </Link>

        <Link
          href="/support"
          data-testid="error-support-link"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors min-h-[44px]"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
