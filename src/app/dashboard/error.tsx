'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error Caught:', error);
  }, [error]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-bg-canvas p-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#F2F2F2', border: '1px solid #CCCCCC' }}>
        <AlertTriangle className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
      </div>
      
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Failed to load view
      </h2>
      
      <p className="text-sm text-center max-w-md mb-6" style={{ color: 'var(--text-secondary)' }}>
        We encountered an error loading this section of the dashboard.
        {error.digest && <span className="block mt-1 text-xs">Error ID: {error.digest}</span>}
      </p>

      <button
        onClick={() => reset()}
        className="inline-flex items-center justify-center gap-2 bg-pw-black text-white px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCcw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
