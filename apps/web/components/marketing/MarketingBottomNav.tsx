'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  TreeStructure,
  Calculator,
  CurrencyDollar,
  Robot,
} from '@/components/icons/PhosphorIcons';

export interface MobileNavItem {
  id: string;
  label: string;
  href: string;
}

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'how-it-works', label: 'How It Works', href: '/how-it-works' },
  { id: 'calculator', label: 'Deal Calculator', href: '/deal-calculator' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
  { id: 'support', label: 'Support', href: '/support' },
];

function NavIcon({ id, isActive }: { id: string; isActive: boolean }) {
  const size = 20;
  const weight = isActive ? 'bold' : 'regular';
  switch (id) {
    case 'home':
      return <House size={size} weight={weight} />;
    case 'how-it-works':
      return <TreeStructure size={size} weight={weight} />;
    case 'calculator':
      return <Calculator size={size} weight={weight} />;
    case 'pricing':
      return <CurrencyDollar size={size} weight={weight} />;
    case 'support':
      return <Robot size={size} weight={weight} />;
    default:
      return <House size={size} weight={weight} />;
  }
}

export default function MarketingBottomNav() {
  const pathname = usePathname() || '/';

  return (
    <nav
      aria-label="Mobile navigation"
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl shadow-lg md:hidden pointer-events-auto"
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
            className={`group relative flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] text-center no-underline transition-colors touch-press ${
              isActive
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {/* Active Indicator Line */}
            {isActive && (
              <span
                className="absolute -top-1 h-0.5 w-8 rounded-none bg-primary"
                aria-hidden="true"
              />
            )}

            <div
              className="relative flex items-center justify-center"
              data-icon={
                item.id === 'home'
                  ? 'home'
                  : item.id === 'how-it-works'
                  ? 'hub'
                  : item.id === 'calculator'
                  ? 'calculate'
                  : item.id === 'pricing'
                  ? 'payments'
                  : 'smart_toy'
              }
            >
              <NavIcon id={item.id} isActive={isActive} />
            </div>

            <span
              className={`mt-0.5 text-[10px] tracking-tight truncate max-w-[68px] ${
                isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
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
