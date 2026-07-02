'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function PaywallRedirectGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't redirect while auth/profile is loading
    if (loading) return;

    // Billing/Profile settings paths are exempt so users can update card details or logout
    if (
      pathname?.startsWith('/dashboard/settings/billing') ||
      pathname?.startsWith('/dashboard/settings/profile') ||
      pathname === '/dashboard/settings' ||
      pathname?.startsWith('/dashboard/settings/general')
    ) {
      return;
    }

    if (!profile) return;

    const status = profile.subscriptionStatus;
    const isGuest = profile.inviteToken && profile.invitedToProjectId;

    // Only hard-block on explicit billing failure or cancellation.
    // inactive/free/undefined = registered user on the free tier — allow through.
    // The project-count gate (max 3) is enforced at the feature level, not here.
    const isHardBlocked = status === 'canceled' || status === 'payment_failed';

    if (isHardBlocked && !isGuest && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/pricing');
    }
  }, [profile, loading, pathname, router]);

  return null;
}
