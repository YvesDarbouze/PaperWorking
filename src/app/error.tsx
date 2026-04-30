'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error Caught:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-bg-canvas p-6">
      <div className="max-w-md w-full bg-bg-surface border border-border-ui shadow-sm p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#F2F2F2', border: '1px solid #CCCCCC' }}>
          <AlertTriangle className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h2>
        
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          We encountered an unexpected error. Our team has been notified.
          {error.digest && <span className="block mt-2 text-xs">Error ID: {error.digest}</span>}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-pw-black text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCcw className="w-4 h-4" />
            Try again
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-pw-black border border-border-ui px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
