'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { safeLogout } from '@/lib/auth/sessionService';

export default function SessionExpiredModal({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();

  const handleSignInAgain = async () => {
    onDismiss();
    await safeLogout();
    router.replace('/login?reason=session_expired');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm mx-4 bg-pw-glass-bg border border-pw-border backdrop-blur-[20px] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h2 id="session-expired-title" className="text-lg font-semibold text-pw-black">
              Session Expired
            </h2>
            <p className="mt-2 text-sm text-pw-muted leading-relaxed">
              Your session has expired. Please log back in.
            </p>
          </div>
          <button
            onClick={handleSignInAgain}
            className="pw-btn pw-btn--primary pw-btn--pill w-full h-12 text-sm font-semibold transition-colors"
          >
            Sign in again
          </button>
        </div>
      </div>
    </div>
  );
}
