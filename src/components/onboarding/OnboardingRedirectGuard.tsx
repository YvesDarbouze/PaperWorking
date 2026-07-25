'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOnboardingState } from '@/hooks/useOnboardingState';

/* ═══════════════════════════════════════════════════════
   OnboardingRedirectGuard
   
   Dropped into the dashboard layout. Redirects new users
   who haven't selected their onboarding intent to the
   /onboarding/intent page.
   
   Checks are client-side (profile from Firestore listener)
   so this works seamlessly with the existing auth flow.
   ═══════════════════════════════════════════════════════ */

export function OnboardingRedirectGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { showIntent, loading } = useOnboardingState();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // E2E test mode: __e2e_bypass_onboarding=1 cookie disables the redirect so Playwright
    // tests can navigate directly to dashboard routes without completing onboarding.
    if (typeof document !== 'undefined' && document.cookie.includes('__e2e_bypass_onboarding=1')) return;

    // Don't redirect while auth/profile is loading
    if (loading) return;

    // Don't redirect from the wizard (user might be in flow)
    if (pathname?.includes('wizard=true')) return;

    // Don't redirect if we already did this session
    if (hasRedirected.current) return;

    // Redirect if user needs intent selection
    if (showIntent) {
      hasRedirected.current = true;
      router.replace('/onboarding/intent');
    }
  }, [showIntent, loading, pathname, router]);

  return null; // Render nothing — this is a behavior-only component
}
