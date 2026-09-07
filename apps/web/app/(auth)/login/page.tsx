import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginPanel from '@/components/auth/LoginPanel';

export const metadata: Metadata = {
  title: 'Sign In',
};

function LoginFallback() {
  return <div className="auth-card h-[480px] w-full max-w-[440px] animate-pulse" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPanel />
    </Suspense>
  );
}
