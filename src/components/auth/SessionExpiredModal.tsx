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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm mx-4 bg-[#141414] border border-[#2e2e2e] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-950/60 border border-amber-700/30">
            <ShieldAlert className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 id="session-expired-title" className="text-[18px] font-semibold text-white">
              Session Expired
            </h2>
            <p className="mt-2 text-[13px] text-[#888] leading-relaxed">
              Your session has expired. Please log back in.
            </p>
          </div>
          <button
            onClick={handleSignInAgain}
            className="w-full h-[48px] bg-white hover:bg-[#e0e0e0] rounded-xl text-[14px] font-semibold text-black transition-colors"
          >
            Sign in again
          </button>
        </div>
      </div>
    </div>
  );
}
