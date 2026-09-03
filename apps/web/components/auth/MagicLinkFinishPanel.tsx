'use client';

import Link from 'next/link';
import AuthCard, { AuthNotice } from '@/components/auth/AuthCard';
import { AUTH_ROUTES } from '@/lib/auth/routes';

/** Magic-link finish — Supabase removed (Phase E). Firebase magic link not yet enabled. */
export default function MagicLinkFinishPanel() {
  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Magic link sign-in</h1>
        <p className="text-sm text-[rgba(253,255,252,0.65)]">
          Passwordless email links are not enabled in this environment. Use password or social
          sign-in instead.
        </p>
      </div>
      <AuthNotice>
        Supabase Auth was retired in Phase E. Firebase magic links are planned but not enabled yet.
      </AuthNotice>
      <div className="mt-6 text-center">
        <Link
          href={AUTH_ROUTES.login}
          className="text-sm text-[rgba(253,255,252,0.65)] no-underline hover:text-[#fdfffc]"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
