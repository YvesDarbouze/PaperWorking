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

    // Check subscription status
    const status = profile.subscriptionStatus;
    const isPaid = status === 'active' || status === 'trialing' || status === 'past_due';
    const isGuest = profile.inviteToken && profile.invitedToProjectId;

    // If not paid and not a guest, redirect to /pricing
    if (!isPaid && !isGuest && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/pricing');
    }
  }, [profile, loading, pathname, router]);

  return null;
}
