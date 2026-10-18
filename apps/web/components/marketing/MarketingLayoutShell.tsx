'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import DashboardProviders from '@/components/dashboard/DashboardProviders';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingHeader from '@/components/marketing/MarketingHeader';
import MarketingBottomNav from '@/components/marketing/MarketingBottomNav';
import StickyMobileCta from '@/components/marketing/StickyMobileCta';
import { fetchSessionProfile } from '@/lib/auth/session-client';
import { hasClientSessionCookie } from '@/lib/auth/session-cookies';

export function isInAppSupportRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/support' ||
    pathname.startsWith('/support/') ||
    pathname === '/help' ||
    pathname.startsWith('/help/')
  );
}

export default function MarketingLayoutShell({
  children,
  initialAuthenticated = false,
  initialAccountType = 'investor',
}: {
  children: React.ReactNode;
  initialAuthenticated?: boolean;
  initialAccountType?: string;
}) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(initialAuthenticated || hasClientSessionCookie()),
  );
  const [accountType, setAccountType] = useState(initialAccountType);

  useEffect(() => {
    let cancelled = false;
    fetchSessionProfile().then((profile) => {
      if (cancelled) return;
      if (profile.authenticated) {
        setAuthenticated(true);
        setAccountType(profile.accountType ?? initialAccountType);
      } else {
        setAuthenticated(Boolean(initialAuthenticated || hasClientSessionCookie()));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, initialAuthenticated, initialAccountType]);

  if (authenticated && accountType !== 'vendor' && isInAppSupportRoute(pathname)) {
    return <DashboardProviders>{children}</DashboardProviders>;
  }

  return (
    <div className="marketing-shell min-h-screen text-foreground bg-background">
      <MarketingHeader />
      <main className="relative pt-16 md:pt-[72px] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <MarketingFooter />
      <StickyMobileCta />
      <MarketingBottomNav />
    </div>
  );
}
