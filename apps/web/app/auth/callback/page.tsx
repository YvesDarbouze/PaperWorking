'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_ROUTES } from '@/lib/auth/routes';

/** Legacy Supabase OAuth callback — retired in Phase E (Firebase uses popup flow). */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(AUTH_ROUTES.login);
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-black/60">
      Redirecting to sign in…
    </div>
  );
}
