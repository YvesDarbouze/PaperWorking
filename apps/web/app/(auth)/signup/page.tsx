import { Suspense } from 'react';
import SignupAccountTypePanel from '@/components/auth/SignupAccountTypePanel';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="auth-card h-[520px] w-full max-w-[520px] animate-pulse" />}>
      <SignupAccountTypePanel />
    </Suspense>
  );
}
