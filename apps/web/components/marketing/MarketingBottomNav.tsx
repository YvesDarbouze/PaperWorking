'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MobileNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: 'home' },
  { id: 'how-it-works', label: 'How It Works', href: '/how-it-works', icon: 'hub' },
  { id: 'calculator', label: 'Deal Calculator', href: '/deal-calculator', icon: 'calculate' },
  { id: 'pricing', label: 'Pricing', href: '/pricing', icon: 'payments' },
  { id: 'support', label: 'Support', href: '/support', icon: 'smart_toy' },
];

export default function MarketingBottomNav() {
  const pathname = usePathname() || '/';

  return (
    <nav
      aria-label="Mobile navigation"
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0a0a0f]/95 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.45)] md:hidden pointer-events-auto"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/' || pathname === ''
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`mobile-nav-${item.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center no-underline transition-all duration-150 touch-press ${
              isActive
                ? 'text-[color:var(--color-primary)] font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {/* Active Glow Pill */}
            {isActive && (
              <span
                className="absolute -top-1 h-0.5 w-8 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
                aria-hidden="true"
              />
            )}

            <div className="relative flex items-center justify-center">
              <span
                className={`material-symbols-outlined text-[22px] transition-transform duration-150 group-active:scale-95 ${
                  isActive ? 'text-[color:var(--color-primary)]' : 'text-white/65 group-hover:text-white'
                }`}
              >
                {item.icon}
              </span>
            </div>

            <span
              className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                isActive ? 'font-semibold text-white' : 'font-medium text-white/60'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
