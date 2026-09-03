import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthActionPanel from '@/components/auth/AuthActionPanel';
import Logo from '@/components/marketing/Logo';

export const metadata: Metadata = {
  title: 'Authentication Action',
  robots: 'noindex, nofollow',
};

export default function AuthActionPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-[#fdfffc]">
      <div className="mx-auto mb-8 max-w-md text-center">
        <Logo href="/" />
      </div>
      <div className="mx-auto max-w-md">
        <Suspense fallback={<div className="h-[360px] animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />}>
          <AuthActionPanel />
        </Suspense>
      </div>
      <p className="mx-auto mt-8 max-w-md text-center text-xs text-white/45">
        Firebase action codes (`mode`, `oobCode`) render here. Full verification connects at cutover.
      </p>
      <p className="mt-3 text-center">
        <Link href="/login" className="text-sm text-white/70 underline-offset-2 hover:text-white hover:underline">
          Return to sign in
        </Link>
      </p>
    </div>
  );
}
