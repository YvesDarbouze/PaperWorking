import { Suspense } from 'react';
import MagicLinkFinishPanel from '@/components/auth/MagicLinkFinishPanel';

export default function LoginFinishPage() {
  return (
    <Suspense fallback={<div className="auth-card h-[320px] w-full max-w-[440px] animate-pulse" />}>
      <MagicLinkFinishPanel />
    </Suspense>
  );
}
