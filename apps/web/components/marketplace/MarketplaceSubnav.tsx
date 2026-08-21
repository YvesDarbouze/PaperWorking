'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
    `flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
      active
        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
        : 'border-transparent text-white/55 hover:bg-white/5 hover:text-[#fdfffc]'
    }`;

  return (
    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
      <nav className="flex flex-wrap items-center gap-2" aria-label="Marketplace Subnavigation">
        {!isVendor ? (
          <Link href="/dashboard/deals" className={linkClass(isDeals)}>
            <span className="material-symbols-outlined text-[16px]">handshake</span>
            <span>Deal Marketplace</span>
          </Link>
        ) : null}

        <Link href="/dashboard/marketplace" className={linkClass(isVendors)}>
          <span className="material-symbols-outlined text-[16px]">storefront</span>
          <span>Vendor Marketplace</span>
        </Link>

        {!isVendor ? (
          <Link href="/dashboard/marketplace?tab=investors" className={linkClass(isInvestors)}>
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>Investors</span>
          </Link>
        ) : null}
      </nav>

      <div className="hidden font-mono text-[11px] text-white/40 sm:block">
        PaperWorking Marketplaces · Introductions &amp; Interest Tracking
      </div>
    </div>
  );
}
