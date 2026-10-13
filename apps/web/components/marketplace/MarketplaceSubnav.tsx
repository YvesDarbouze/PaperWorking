'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Handshake, Storefront, Users } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';

export function MarketplaceSubnav() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const tab = searchParams.get('tab');
  const isDeals = pathname.startsWith('/dashboard/deals') || pathname.startsWith('/deals');
  const isVendors =
    (pathname.startsWith('/dashboard/marketplace') || pathname.startsWith('/vendor/marketplace')) &&
    tab !== 'investors';
  const isInvestors = pathname.startsWith('/dashboard/marketplace') && tab === 'investors';

  const isVendor = (profile?.accountType || '').toLowerCase() === 'vendor';

  const linkClass = (active: boolean) =>
    `flex min-h-[44px] items-center gap-2 rounded-none border px-4 py-2 text-xs font-semibold transition-all ${
      active
        ? 'border-border bg-accent text-foreground'
        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
      <nav className="flex flex-wrap items-center gap-2" aria-label="Marketplace Subnavigation">
        <Link href="/dashboard/deals" className={linkClass(isDeals)}>
          <Handshake className="h-4 w-4 shrink-0" />
          <span>Deal Marketplace</span>
        </Link>

        <Link href="/dashboard/marketplace" className={linkClass(isVendors)}>
          <Storefront className="h-4 w-4 shrink-0" />
          <span>Vendor Directory</span>
        </Link>

        {!isVendor ? (
          <Link href="/dashboard/marketplace?tab=investors" className={linkClass(isInvestors)}>
            <Users className="h-4 w-4 shrink-0" />
            <span>Investors</span>
          </Link>
        ) : null}
      </nav>

      <div className="hidden font-mono text-[11px] text-muted-foreground sm:block">
        PaperWorking Directory · Introductions &amp; Interest Tracking
      </div>
    </div>
  );
}
