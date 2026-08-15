'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Store, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   MarketplaceSubnav — Reusable In-App Marketplace Header Nav
   Allows signed-in users to switch seamlessly between:
   - Deal's Marketplace (/dashboard/deals) [Stripped for Vendor role]
   - Vendor's Marketplace (/vendor/marketplace)
   - Investors Directory (/marketplace/investors)
   ═══════════════════════════════════════════════════════ */

export function MarketplaceSubnav() {
  const pathname = usePathname?.() ?? '';
  const { user } = useAuth();

  const isDeals = pathname?.startsWith('/dashboard/deals') || pathname?.startsWith('/deals');
  const isVendors = pathname?.startsWith('/dashboard/marketplace') || pathname?.startsWith('/vendor/marketplace');
  const isInvestors = pathname?.startsWith('/marketplace/investors');

  const isVendor = user?.role === 'vendor' || user?.accountType === 'vendor';

  return (
    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
      <div className="flex items-center gap-2" role="navigation" aria-label="Marketplace Subnavigation">
        {!isVendor && (
          <Link
            href="/dashboard/deals"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              isDeals
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Deal Marketplace</span>
          </Link>
        )}

        <Link
          href="/dashboard/marketplace"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
            isVendors
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Vendor Marketplace</span>
        </Link>

        {!isVendor && (
          <Link
            href="/marketplace/investors"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
              isInvestors
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Investors</span>
          </Link>
        )}
      </div>

      <div className="hidden sm:block text-[11px] text-on-surface-variant/70 font-mono">
        PaperWorking Marketplaces · Introductions &amp; Interest Tracking
      </div>
    </div>
  );
}
