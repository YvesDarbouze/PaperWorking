'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root Global Error Caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F2F2] p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-[#CCCCCC] shadow-sm p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#F2F2F2', border: '1px solid #CCCCCC' }}>
              <AlertTriangle className="w-8 h-8 text-[#7F7F7F]" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3 text-[#595959]">
              Critical System Error
            </h2>
            
            <p className="text-sm mb-8 text-[#7F7F7F]">
              A critical error occurred while rendering the application.
              {error.digest && <span className="block mt-2 text-xs">Error ID: {error.digest}</span>}
            </p>

            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0d0d0d] text-white px-5 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
